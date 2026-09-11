# Repository Guide

This file applies to the entire repository. It describes the current structure,
architectural boundaries, and conventions that contributors and coding agents
must preserve.

## System overview

Membrane is a single-process REST and MCP service built with Node.js,
TypeScript, Fastify, Zod, Kysely, and PGlite. Fastify owns the HTTP and logging
boundaries. Zod schemas define runtime REST contracts and generate the OpenAPI
3.1 document. The MCP server exposes application operations as tools through a
Streamable HTTP endpoint. Kysely provides typed database access over an embedded
PGlite database. A React single-page application built with Vite and MUI is
served by the same Fastify process from `dist/client/`. A Swift package under
`swift/` provides a native client generated from the service's own OpenAPI
document.

The main dependency flow is:

```text
process entrypoint
  -> configuration and database initialization
  -> application composition
  -> Fastify REST, MCP, and static client transport plugins
  -> application/database operations
  -> Kysely
  -> PGlite
```

The browser and Swift clients are separate build targets that consume the same
HTTP surface. The browser client may import transport-neutral contracts from
`src/application/`; the Swift client is generated from the exported OpenAPI
document. Nothing under `src/` may import from `client/` or `swift/`.

Dependencies should continue to point inward from entrypoints and transport
code toward application and persistence code. Lower-level modules must not
import the process entrypoint.

## Repository structure

```text
.
├── AGENTS.md                 Repository architecture and contributor guidance
├── README.md                 Setup, commands, endpoints, and operations
├── package.json              Dependencies, Node constraint, and npm scripts
├── package-lock.json         Reproducible npm dependency graph
├── tsconfig.json             Strict TypeScript settings for source and tests
├── tsconfig.build.json       Production compilation settings
├── vitest.config.ts          Test runner globals and timeouts
├── .node-version             Exact local Node.js version
├── .env.example              Supported environment variables and defaults
├── ecosystem.config.cjs      Single-process PM2 configuration
├── swift/
│   ├── Package.swift         Swift package manifest and dependency pins
│   ├── Package.resolved      Resolved dependency versions
│   ├── Scripts/
│   │   └── run-tests.sh      Test runner with toolchain detection
│   ├── Sources/
│   │   ├── MembraneClient/   Published client library
│   │   │   ├── openapi.json  Exported contract, input to code generation
│   │   │   └── openapi-generator-config.yaml
│   │   └── membrane-cli/     Executable that exercises the library
│   └── Tests/
│       └── MembraneClientTests/
├── client/
│   ├── index.html            Single-page application document
│   ├── vite.config.ts        Client build, dev server, and API proxy
│   ├── tsconfig.json         Browser TypeScript settings for client sources
│   ├── tsconfig.node.json    TypeScript settings for the Vite config itself
│   └── src/
│       ├── main.tsx          React root, theme provider, and baseline styles
│       ├── App.tsx           Application shell and page layout
│       ├── theme.ts          MUI theme and colour schemes
│       ├── api/
│       │   ├── health.ts     Typed `GET /health` reader
│       │   └── useHealth.ts  Health request state and refresh hook
│       └── components/       Presentational MUI components
├── src/
│   ├── server.ts             Runtime entrypoint and process lifecycle
│   ├── app.ts                Fastify composition root and application factory
│   ├── config.ts             Zod-validated environment configuration
│   ├── application/
│   │   └── health.ts         Transport-neutral health operation and DTO shape
│   ├── routes/
│   │   ├── health.ts         Health HTTP contract and handler
│   │   └── client.ts         Static hosting for the built client
│   ├── openapi/
│   │   ├── document.ts       OpenAPI document generation and its committed path
│   │   └── export.ts         Standalone document export command
│   ├── mcp/
│   │   ├── server.ts         MCP server factory and tool registration
│   │   └── routes.ts         Streamable HTTP adapter and request protection
│   ├── db/
│   │   ├── database.ts       PGlite and Kysely database factory
│   │   ├── types.ts          Kysely database/table type definitions
│   │   ├── migrator.ts       Programmatic migration runner
│   │   ├── migrate.ts        Standalone migration command entrypoint
│   │   └── migrations/
│   │       ├── index.ts      Explicit ordered migration registry
│   │       └── 001_initial.ts
│   └── types/
│       └── fastify.d.ts      Fastify instance type augmentation
└── tests/
    ├── health.test.ts        HTTP and OpenAPI integration contract
    ├── client.test.ts        Static hosting and API/shell boundary contract
    ├── openapi.test.ts       Guard that the committed document is current
    ├── database.test.ts      Persistent database startup and migration test
    ├── mcp-http.test.ts      MCP HTTP transport and security contract
    └── mcp-server.test.ts    MCP tool discovery and invocation contract
```

The following directories are generated or local-only and must remain ignored:

- `node_modules/` contains installed dependencies.
- `dist/` contains compiled production JavaScript, declarations, and the
  client bundle in `dist/client/`.
- `swift/.build/` and `swift/.swiftpm/` contain Swift build artifacts,
  including the generated client sources.
- `coverage/` contains generated test coverage.
- `data/` contains the local persistent PGlite database.

## Architectural responsibilities

### Process entrypoint: `src/server.ts`

`server.ts` is the only production process entrypoint. It may read the process
environment, configure development or production logging, install signal
handlers, and start listening on a network port. Startup occurs in this order:

1. Parse and validate environment configuration.
2. Create the persistent database.
3. Apply pending migrations.
4. Build the Fastify application with injected dependencies.
5. Register shutdown handlers.
6. Start listening.

Do not put route handlers or business rules in this file. Keep process-global
state and direct `process` access out of reusable application modules.

### Composition root: `src/app.ts`

`buildApp()` assembles and returns a Fastify instance without opening a network
socket. It receives infrastructure through `BuildAppOptions`, which keeps the
application testable through `app.inject()`.

The composition order matters:

1. Decorate Fastify with shared dependencies.
2. Register resource cleanup hooks.
3. Install Zod validator and serializer compilers.
4. Register the Zod/OpenAPI and Swagger plugins.
5. Register REST route plugins.
6. Create and register the MCP handler and its scoped transport plugin.
7. Register static client hosting last, so it can never shadow an API route.

The application owns the injected database and MCP handler lifetimes after
construction. Closing the Fastify instance must close both through `onClose`
hooks.

### Application layer: `src/application/`

Application modules contain transport-neutral operations and shared contract
shapes. REST handlers and MCP tools should call the same operation instead of
duplicating behavior. These modules must not depend on Fastify, MCP transports,
process environment variables, or process lifecycle concerns.

Schema metadata can differ by transport. Share the underlying Zod field shape
when REST needs a named OpenAPI schema while MCP needs an inline object schema;
do not let transport metadata change the observable application result.

### HTTP layer: `src/routes/`

Each route module is a Fastify plugin for one cohesive API surface. A route owns
its HTTP-specific concerns:

- method and URL;
- request parameters, query, headers, and body schemas;
- response schemas for every documented status;
- OpenAPI metadata;
- translation between HTTP data and application calls.

Use Zod v4 schemas with `fastify-zod-openapi`. Do not define a separate DTO type
when it can be inferred from the runtime schema. Response data must pass through
the configured Zod serializer so implementation output cannot drift from the
documented contract.

Register new route plugins in `buildApp()` after the OpenAPI plugins. Route
modules must not call `listen()`, read environment variables directly, or create
their own persistent database instance.

### MCP layer: `src/mcp/`

`server.ts` creates the protocol server and registers tools. Tool handlers adapt
MCP input to transport-neutral application operations and return both text and
structured content when an output schema is declared. Tools must have accurate
descriptions, schemas, and behavioral annotations.

`routes.ts` owns the MCP Streamable HTTP boundary at `/mcp`. It adapts Fastify's
raw Node.js request and response to the MCP SDK handler and encapsulates Host and
Origin validation so those hooks do not affect REST or documentation routes.
Keep the MCP route hidden from OpenAPI: it is a protocol endpoint, not an
ordinary REST operation.

`MCP_ALLOWED_HOSTS` contains hostnames without schemes or ports and controls both
Host and Origin validation. Missing Origin headers are allowed for non-browser
clients. These checks are request-boundary protections, not authentication. Add
authentication and authorization before exposing MCP tools to untrusted
networks, especially when introducing tools that access sensitive data or cause
side effects.

### Static client hosting: `src/routes/client.ts`

`clientRoutes` serves the built single-page application and is registered last in
`buildApp()`, only when `clientDistDir` is supplied. It owns two concerns:

- serving `dist/client/` through `@fastify/static` with `wildcard: false`, so
  the plugin's own not-found handler still runs for unmatched paths;
- resolving unknown client-side routes to the application shell.

The shell fallback must stay narrow. A request only receives `index.html` when
it is a `GET` or `HEAD`, it accepts HTML, and its path is not below an API
prefix. Every other unmatched request keeps its JSON 404, so a mistyped API path
never returns a page. Add new API prefixes to `apiPrefixes` when introducing a
route surface outside `/health`, `/mcp`, and `/docs`.

Registration is skipped, with a warning, when the bundle is absent. This keeps
`npm run dev:server` usable on its own while Vite serves the client. Hashed
files under `assets/` are sent as immutable; the shell is sent as `no-cache` so
a deployment is picked up on the next navigation.

### Contract export: `src/openapi/`

`document.ts` builds the application against a throwaway in-memory database and
reads the OpenAPI document its route schemas generate. `export.ts` is the
standalone command behind `npm run openapi:export`, mirroring how `migrate.ts`
wraps the migrator.

The exported document is committed at `swift/Sources/MembraneClient/openapi.json`
because it is the Swift generator's input, and `tests/openapi.test.ts` fails
when it drifts from what the application produces. Any route change therefore
requires re-running the export in the same commit. Do not hand-edit the
committed document.

### Swift client: `swift/`

A Swift package exposing `MembraneClient`, generated from the committed OpenAPI
document by `swift-openapi-generator` at build time. Like the browser client it
consumes the HTTP surface and is not part of the service's inward dependency
flow.

Generated code is produced with `accessModifier: internal`, so `Client`,
`Components`, and `Operations` never escape the module. The published surface is
hand-written and small:

- `MembraneClient` wraps the generated client and exposes one method per
  operation. A regenerated document therefore cannot change the package's public
  API without a deliberate edit.
- `HealthStatus` republishes the generated payload enum. Its initializer
  switches exhaustively with no `default`, so a widened contract fails the build
  instead of silently mapping to the wrong value.
- `MembraneClientError` narrows `OpenAPIRuntime`'s `ClientError`, whose
  description embeds the whole request and input, into `transportFailure` and
  `unexpectedResponse`. `health()` uses typed `throws`, keeping the failure
  contract in the signature.

Keep this shape when adding operations: generate the transport, publish a
hand-written method and model, and map the generated payload through an
exhaustive switch.

Tests use a stub `ClientTransport` and never bind a socket, mirroring the
`app.inject()` rule on the service side. Run them with
`swift/Scripts/run-tests.sh`, which adds the framework and rpath flags needed
when a machine has only the Command Line Tools; swift-testing ships inside Xcode
and `swift test` finds it unaided when a full Xcode is selected.

The Swift package is deliberately outside `npm run check`: the toolchain is
macOS-only, while `check` must run wherever the Node service builds. Run
`npm run swift:test` alongside it when changing the contract or the package.

### Client layer: `client/`

The client is a Vite-built React application using MUI. It is a transport
consumer, not part of the service's inward dependency flow.

- `main.tsx` mounts React and installs the MUI theme and `CssBaseline`.
- `theme.ts` owns the theme, including both colour schemes. The UI uses a system
  font stack; do not introduce a runtime webfont request.
- `api/` holds HTTP readers and their request-state hooks. A reader must
  validate the response with the Zod schema exported from `src/application/`,
  imported through the `@server/*` alias, so the client cannot drift from the
  documented contract.
- `components/` holds presentational components.

Client sources are typechecked by `client/tsconfig.json` under browser
libraries, and the Vite config by `client/tsconfig.node.json`. Both run in
`npm run typecheck`. The client must not import Fastify, Kysely, PGlite, or
anything under `src/` other than transport-neutral application contracts.

### Persistence layer: `src/db/`

`database.ts` is the sole Kysely/PGlite construction boundary. Passing no
`dataDir` creates an in-memory database for tests; passing a path creates the
directory recursively and opens a persistent database.

`types.ts` describes the current SQL schema for Kysely. Keep these TypeScript
table definitions synchronized with migrations. They describe the expected
schema but do not modify the database by themselves.

`migrator.ts` exposes migration execution to application startup and tests.
`migrate.ts` is the standalone CLI entrypoint used by `npm run migrate`.

Every schema change requires a new, monotonically named migration under
`src/db/migrations/` and an entry in its explicit registry. Do not edit a
migration that may already have been applied outside local development. Provide
both `up` and `down` when reversal is safe and meaningful.

Prefer Kysely's typed query and schema builders. Use raw SQL fragments only when
the builder cannot express a required PostgreSQL operation clearly.

### Configuration: `src/config.ts`

All supported environment variables belong in the Zod environment schema and
`.env.example`. Application code should consume the parsed `AppConfig` rather
than reading `process.env` throughout the codebase. Invalid configuration must
fail during startup, before the server listens. Keep `MCP_ALLOWED_HOSTS`
comma-separated in the environment and pass its parsed hostname list through
`BuildAppOptions`. `CLIENT_DIST_DIR` points at the built client and reaches the
application as `BuildAppOptions.clientDistDir`; omitting that option disables
static hosting entirely, which is what the API-only tests rely on.

### Shared Fastify types: `src/types/`

Fastify decorations require module augmentation in this directory. Keep runtime
decoration in `buildApp()` and its TypeScript declaration synchronized.

## Runtime and request lifecycle

The production lifecycle is:

```text
environment
  -> Zod configuration parsing
  -> persistent PGlite instance
  -> Kysely migrations
  -> buildApp(dependencies)
  -> Fastify listen
  -> SIGINT or SIGTERM
  -> Fastify close hooks
  -> database close
```

A normal HTTP request follows this path:

```text
request
  -> Fastify routing
  -> Zod request validation
  -> route handler
  -> Kysely/PGlite when persistence is needed
  -> Zod response serialization
  -> response
```

An MCP request follows this path:

```text
MCP client
  -> Fastify /mcp route
  -> Host and Origin validation
  -> Node.js MCP HTTP adapter
  -> per-request MCP server
  -> MCP tool handler
  -> shared application operation
  -> MCP structured and text result
```

Use `request.log` or `app.log` for operational logging so request identifiers and
structured context are preserved. Production logs are JSON. `pino-pretty` is a
development-only transport. Direct console output is limited to bootstrap or
standalone CLI failure reporting before a Fastify logger is available.

## Testing architecture

Vitest is the test runner, configured in `vitest.config.ts`. HTTP integration
tests must call the public Fastify boundary through `app.inject()`; do not add
Supertest or bind a test server to a real port.

Test and hook timeouts are raised well above the Vitest defaults because each
test file instantiates PGlite's WebAssembly build, which costs several seconds
under the parallel suite. Keep that headroom when editing the configuration: the
defaults make database-backed suites fail intermittently rather than reliably.

Tests that need persistence should create their own in-memory PGlite database,
apply migrations, inject it into `buildApp()`, and close the app after each test.
Persistent-filesystem behavior may use an isolated operating-system temporary
directory and must clean it after the database is closed. Tests must not share
the production `data/` directory.

For a new endpoint, test at least:

- the observable HTTP status and response body;
- meaningful validation failures for request inputs;
- the endpoint's presence and response in the generated OpenAPI document;
- persistence behavior when the endpoint reads or writes data.

`tests/openapi.test.ts` compares the committed OpenAPI document with the one the
application generates. It is the guard that keeps the Swift client's generated
types honest, so a route change must be accompanied by `npm run openapi:export`
in the same commit.

Static hosting is tested through `app.inject()` against a temporary directory
that stands in for a built bundle, so the suite never depends on `dist/client/`
having been built. Any change to the shell fallback must keep coverage for both
directions: a client-side route resolving to the shell, and an unknown API path
still answering 404.

For a new MCP tool, use the official in-memory client transport to test tool
discovery, annotations, invocation, and structured output. Add `app.inject()`
coverage when transport behavior changes. MCP HTTP tests must include relevant
Host and Origin allow-list behavior and must not open a real network port.

Run the full required verification before handing off a change:

```bash
npm run check
```

This command runs strict type checking of the server, client, and Vite config,
all Vitest tests, then the production TypeScript build followed by the Vite
client build. `npm run build` must be run before `npm start` for the service to
serve the client.

`check` intentionally excludes the Swift package, which needs a macOS toolchain.
When a change touches the API contract or `swift/`, also run:

```bash
npm run swift:test
```

## TypeScript and module conventions

- The project is ESM-only (`"type": "module"`).
- Use NodeNext module resolution for server code and bundler resolution for the
  client.
- Include `.js` extensions in relative TypeScript imports so compiled ESM works
  in Node.js. Client imports keep the same convention for consistency; Vite and
  bundler resolution map them back to the `.ts`/`.tsx` sources.
- Keep strict compiler settings enabled; do not suppress errors with `any` or
  unchecked type assertions when a precise type can be expressed.
- Prefer type-only imports where a symbol is not needed at runtime.
- Keep files focused on one architectural responsibility.

## Operational constraints

PGlite is embedded in the Node.js process and its persistent data directory must
have a single owner. Production must therefore use PM2 `fork` mode with
`instances: 1`, as configured in `ecosystem.config.cjs`. Do not enable PM2
cluster mode or run multiple service processes against one `PGLITE_DATA_DIR`.

If the service needs horizontal scaling, multiple workers, multiple hosts, or
independent access to the same database, replace the embedded database boundary
with a separately managed PostgreSQL server before increasing process count.

PM2 is intentionally not a project dependency. Install and manage it as a
deployment/runtime tool on the production host while keeping its application
configuration versioned in this repository.
