# Membrane

REST and MCP service built with Fastify, TypeScript, Zod, Kysely, and embedded
PostgreSQL through PGlite, with a React and MUI web client served by the same
process and a Swift client generated from the service's OpenAPI document.

## Requirements

- Node.js 24 LTS (the exact local version is specified in `.node-version`)
- npm
- PM2 on the production host
- Swift 6 and macOS 13 or newer, only to build the Swift client in `swift/`

## Local development

```bash
npm install
npm run dev
```

`npm run dev` starts two processes: the Fastify service on
`http://localhost:3000` and the Vite dev server on `http://localhost:5173`.
Develop the UI against `http://localhost:5173`, which serves the client with hot
module replacement and proxies `/health`, `/mcp`, and `/docs` to the service.
Run `npm run dev:server` or `npm run dev:client` to start just one of them.

PGlite data is stored in `./data/pglite` by default. Supported environment
variables are listed in `.env.example`.

Available endpoints:

- `/` — web client (served from `dist/client/` after `npm run build`)
- `GET /health` — service health check
- `GET|POST|DELETE /mcp` — MCP Streamable HTTP endpoint
- `/docs` — Swagger UI
- `/docs/json` — OpenAPI 3.1 document

## Web client

The client lives in `client/` and is a React single-page application built with
Vite and MUI. It reads `GET /health` and validates the response against the same
Zod schema the service uses to serialize it, so the UI cannot drift from the
documented contract.

`npm run build` emits the bundle to `dist/client/`, and the service serves it
from `/` alongside the API. Client-side routes fall back to the application
shell, while unknown paths below `/health`, `/mcp`, and `/docs` keep returning a
JSON 404. When the bundle has not been built the service logs a warning and
serves the API only, so `npm run dev:server` works on its own.

Set `CLIENT_DIST_DIR` to serve a bundle from a different directory.

## Swift client

`swift/` is a Swift package exposing a `MembraneClient` library and a
`membrane-cli` executable. Its request and response types are generated at build
time by [swift-openapi-generator][generator] from
`swift/Sources/MembraneClient/openapi.json`, which is the service's own exported
OpenAPI document.

```swift
import MembraneClient

let client = MembraneClient(serverURL: URL(string: "http://localhost:3000")!)
let status = try await client.health()  // .ok
```

```bash
npm run swift:build
npm run swift:test
swift/.build/debug/membrane-cli --url http://localhost:3000   # prints: ok
```

The generated code stays internal to the module, so the package's public API is
the hand-written surface in `MembraneClient.swift`, `HealthStatus.swift`, and
`MembraneClientError.swift`. Failures arrive as a typed `MembraneClientError`
rather than the transport's internal error type.

After changing any route, re-export the document so the Swift client keeps up:

```bash
npm run openapi:export
```

`npm run check` fails when the committed document is stale, so this cannot be
forgotten silently.

[generator]: https://github.com/apple/swift-openapi-generator

## MCP

MCP clients connect to `http://localhost:3000/mcp`. The server currently
exposes one read-only tool:

- `health` — returns the same `{ "status": "ok" }` application result used by
  the REST health endpoint.

The MCP transport is stateless and creates an isolated MCP server for each HTTP
request. The endpoint is intentionally hidden from the OpenAPI document because
it implements the MCP Streamable HTTP protocol rather than a conventional REST
operation.

`MCP_ALLOWED_HOSTS` is a comma-separated allow-list of hostnames, without schemes
or ports, used for both `Host` and browser `Origin` validation. It defaults to
`localhost,127.0.0.1,[::1]`. Add the service's real hostname before exposing the
endpoint outside local development. These checks protect the HTTP boundary from
DNS rebinding and cross-site requests; they are not authentication, so deploy an
authentication layer before making the MCP endpoint publicly reachable.

## Checks

```bash
npm run check
```

This command runs the TypeScript type checks for the server, the client, and the
Vite config, then the Vitest suite, then the production server and client builds,
in sequence. Test runner settings live in `vitest.config.ts`.

The Swift package is not part of `npm run check`, because its toolchain is
macOS-only. Run `npm run swift:test` as well when changing the API contract or
the Swift client. On a machine with only the Command Line Tools installed,
`npm run swift:test` supplies the search paths that swift-testing needs; with a
full Xcode selected, plain `swift test --package-path swift` also works. HTTP tests use the built-in `Fastify app.inject()` method and an
isolated in-memory PGlite database.

## Migrations

```bash
npm run migrate
```

Migrations are managed by Kysely Migrator. During normal startup, the server
also applies pending migrations before it begins listening on the configured
port.

## Production and PM2

```bash
npm ci
npm run build
npm run migrate
pm2 start ecosystem.config.cjs
```

`npm run build` compiles the server to `dist/` and the client to `dist/client/`.
Both are required before `pm2 start`; without the client build the service still
starts and serves the API alone.

PGlite is an embedded database that owns its data directory within one process.
For this reason, `ecosystem.config.cjs` deliberately uses `fork` mode and
`instances: 1`. Do not run this service in PM2 cluster mode with a shared
`PGLITE_DATA_DIR`; multiple processes or hosts require a separate PostgreSQL
server.

Production logs are emitted as structured JSON through Fastify's built-in Pino
logger. During local development, `pino-pretty` formats them for readability.

## Project structure

```text
src/
  app.ts                  Fastify app factory
  server.ts               Process entrypoint and graceful shutdown
  config.ts               Zod environment schema
  application/health.ts   Shared health application operation and DTO shape
  routes/health.ts        REST health contract and handler
  routes/client.ts        Static hosting for the built client
  openapi/document.ts     OpenAPI document generation
  openapi/export.ts       Document export command
  mcp/server.ts           MCP server and tool registration
  mcp/routes.ts           Streamable HTTP transport and request protection
  db/                     Kysely, PGlite, and migrations
swift/
  Package.swift           Swift package manifest
  Sources/MembraneClient/ Client library and the exported OpenAPI document
  Sources/membrane-cli/   Executable exercising the library
  Tests/                  Stub-transport contract tests
client/
  index.html              Single-page application document
  vite.config.ts          Client build, dev server, and API proxy
  src/main.tsx            React root and MUI theme provider
  src/App.tsx             Application shell and layout
  src/theme.ts            MUI theme and colour schemes
  src/api/                Typed API readers and request-state hooks
  src/components/         Presentational MUI components
tests/
  health.test.ts          HTTP and OpenAPI integration test
  client.test.ts          Static hosting and API/shell boundary tests
  openapi.test.ts         Guard that the committed document is current
  mcp-http.test.ts        MCP HTTP transport and security integration tests
  mcp-server.test.ts      MCP tool contract test
```
