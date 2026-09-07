# Membrane

REST service built with Fastify, TypeScript, Zod, Kysely, and embedded
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
- `/docs` — Swagger UI
- `/docs/json` — OpenAPI 3.1 document

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
  routes/health.ts        Health endpoint and response DTO
  db/                     Kysely, PGlite, and migrations
tests/
  health.test.ts          HTTP and OpenAPI integration test
```
