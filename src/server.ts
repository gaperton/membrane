import type { FastifyServerOptions } from 'fastify'

import { buildApp } from './app.js'
import { loadConfig, type AppConfig } from './config.js'
import { createDatabase } from './db/database.js'
import { migrateToLatest } from './db/migrator.js'

function createLoggerOptions(
  environment: AppConfig['NODE_ENV'],
): FastifyServerOptions['logger'] {
  if (environment === 'production') {
    return true
  }

  return {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        ignore: 'pid,hostname',
        translateTime: 'SYS:standard',
      },
    },
  }
}

async function start(): Promise<void> {
  const config = loadConfig()
  const database = createDatabase({ dataDir: config.PGLITE_DATA_DIR })

  await migrateToLatest(database)

  const app = await buildApp({
    database,
    logger: createLoggerOptions(config.NODE_ENV),
  })

  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    app.log.info({ signal }, 'Shutting down')

    try {
      await app.close()
    } catch (error) {
      app.log.error(error, 'Graceful shutdown failed')
      process.exitCode = 1
    }
  }

  process.once('SIGINT', () => void shutdown('SIGINT'))
  process.once('SIGTERM', () => void shutdown('SIGTERM'))

  try {
    await app.listen({ host: config.HOST, port: config.PORT })
  } catch (error) {
    app.log.error(error, 'Server startup failed')
    await app.close()
    throw error
  }
}

try {
  await start()
} catch (error) {
  console.error(error)
  process.exitCode = 1
}
