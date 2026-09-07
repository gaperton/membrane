# Membrane

REST and MCP service built with Fastify, TypeScript, Zod, Kysely, and embedded
PostgreSQL through PGlite.

## Requirements

- Node.js 24 LTS (the exact local version is specified in `.node-version`)
- npm
- PM2 on the production host

## Local development

```bash
npm install
npm run dev
```

By default, the service listens on `http://localhost:3000` and stores PGlite
data in `./data/pglite`. Supported environment variables are listed in
`.env.example`.

Available endpoints:

- `GET /health` — service health check
- `GET|POST|DELETE /mcp` — MCP Streamable HTTP endpoint
- `/docs` — Swagger UI
- `/docs/json` — OpenAPI 3.1 document

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

This command runs the TypeScript type check, Vitest suite, and production build
in sequence. HTTP tests use the built-in `Fastify app.inject()` method and an
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
  mcp/server.ts           MCP server and tool registration
  mcp/routes.ts           Streamable HTTP transport and request protection
  db/                     Kysely, PGlite, and migrations
tests/
  health.test.ts          HTTP and OpenAPI integration test
  mcp-http.test.ts        MCP HTTP transport and security integration tests
  mcp-server.test.ts      MCP tool contract test
```
