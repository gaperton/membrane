# Membrane

REST-сервис на Fastify, TypeScript, Zod, Kysely и embedded PostgreSQL через
PGlite.

## Требования

- Node.js 24 LTS (точная локальная версия указана в `.node-version`)
- npm
- PM2 на production-хосте

## Локальный запуск

```bash
npm install
npm run dev
```

По умолчанию сервис слушает `http://localhost:3000`, а данные PGlite хранит в
`./data/pglite`. Поддерживаемые переменные окружения перечислены в
`.env.example`.

Доступные endpoints:

- `GET /health` — проверка состояния сервиса
- `/docs` — Swagger UI
- `/docs/json` — OpenAPI 3.1 document

## Проверки

```bash
npm run check
```

Команда последовательно запускает TypeScript typecheck, тесты Vitest и
production build. HTTP-тесты используют встроенный `Fastify app.inject()` и
отдельную in-memory PGlite-базу.

## Миграции

```bash
npm run migrate
```

Миграции выполняются Kysely Migrator. При обычном запуске сервер также применяет
ожидающие миграции до начала прослушивания порта.

## Production и PM2

```bash
npm ci
npm run build
npm run migrate
pm2 start ecosystem.config.cjs
```

PGlite является embedded-базой и владеет своим каталогом данных внутри одного
процесса. Поэтому `ecosystem.config.cjs` намеренно использует `fork` и
`instances: 1`. Нельзя переключать этот сервис в PM2 cluster mode с общим
`PGLITE_DATA_DIR`; для нескольких процессов или хостов потребуется отдельный
PostgreSQL-сервер.

Production-логи выводятся как structured JSON через встроенный Pino Fastify.
В development они форматируются пакетом `pino-pretty`.

## Структура

```text
src/
  app.ts                  Fastify app factory
  server.ts               process entrypoint и graceful shutdown
  config.ts               Zod-схема окружения
  routes/health.ts        health endpoint и его DTO
  db/                     Kysely, PGlite и миграции
tests/
  health.test.ts          HTTP/OpenAPI integration test
```
