import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import Fastify, {
  type FastifyInstance,
  type FastifyServerOptions,
} from 'fastify'
import {
  fastifyZodOpenApiPlugin,
  fastifyZodOpenApiTransformers,
  serializerCompiler,
  validatorCompiler,
} from 'fastify-zod-openapi'
import type { Kysely } from 'kysely'

import type { Database } from './db/types.js'
import { createMembraneMcpHttpHandler } from './mcp/server.js'
import {
  defaultMcpAllowedHosts,
  mcpRoutes,
} from './mcp/routes.js'
import { clientRoutes } from './routes/client.js'
import { healthRoutes } from './routes/health.js'

export interface BuildAppOptions {
  database: Kysely<Database>
  logger?: FastifyServerOptions['logger']
  mcpAllowedHosts?: string[]
  clientDistDir?: string
}

export async function buildApp(
  options: BuildAppOptions,
): Promise<FastifyInstance> {
  const app = Fastify({ logger: options.logger ?? false })

  app.decorate('database', options.database)
  app.addHook('onClose', async () => {
    await options.database.destroy()
  })

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  await app.register(fastifyZodOpenApiPlugin)
  await app.register(swagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'Membrane API',
        description: 'REST API for Membrane',
        version: '0.1.0',
      },
    },
    ...fastifyZodOpenApiTransformers,
  })
  await app.register(swaggerUi, {
    routePrefix: '/docs',
  })
  await app.register(healthRoutes)

  const mcpHandler = createMembraneMcpHttpHandler()
  app.addHook('onClose', async () => {
    await mcpHandler.close()
  })
  await app.register(mcpRoutes, {
    allowedHosts: options.mcpAllowedHosts ?? defaultMcpAllowedHosts,
    handler: mcpHandler,
  })

  if (options.clientDistDir !== undefined) {
    await app.register(clientRoutes, { distDir: options.clientDistDir })
  }

  return app
}
