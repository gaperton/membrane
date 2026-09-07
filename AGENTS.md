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
PGlite database.

The main dependency flow is:

```text
process entrypoint
  -> configuration and database initialization
  -> application composition
  -> Fastify REST and MCP transport plugins
  -> application/database operations
  -> Kysely
  -> PGlite
```

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
├── .node-version             Exact local Node.js version
├── .env.example              Supported environment variables and defaults
├── ecosystem.config.cjs      Single-process PM2 configuration
├── src/
│   ├── server.ts             Runtime entrypoint and process lifecycle
│   ├── app.ts                Fastify composition root and application factory
│   ├── config.ts             Zod-validated environment configuration
│   ├── application/
│   │   └── health.ts         Transport-neutral health operation and DTO shape
│   ├── routes/
│   │   └── health.ts         Health HTTP contract and handler
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
    ├── database.test.ts      Persistent database startup and migration test
    ├── mcp-http.test.ts      MCP HTTP transport and security contract
    └── mcp-server.test.ts    MCP tool discovery and invocation contract
```

The following directories are generated or local-only and must remain ignored:

- `node_modules/` contains installed dependencies.
- `dist/` contains compiled production JavaScript and declarations.
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
`BuildAppOptions`.

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

Vitest is the test runner. HTTP integration tests must call the public Fastify
boundary through `app.inject()`; do not add Supertest or bind a test server to a
real port.

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

For a new MCP tool, use the official in-memory client transport to test tool
discovery, annotations, invocation, and structured output. Add `app.inject()`
coverage when transport behavior changes. MCP HTTP tests must include relevant
Host and Origin allow-list behavior and must not open a real network port.

Run the full required verification before handing off a change:

```bash
npm run check
```

This command runs strict type checking, all Vitest tests, and the production
TypeScript build.

## TypeScript and module conventions

- The project is ESM-only (`"type": "module"`).
- Use NodeNext module resolution.
- Include `.js` extensions in relative TypeScript imports so compiled ESM works
  in Node.js.
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
