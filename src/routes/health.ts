import {
  type FastifyPluginAsyncZodOpenApi,
  type FastifyZodOpenApiSchema,
} from 'fastify-zod-openapi'

import {
  getHealthStatus,
  healthResponseSchema,
} from '../application/health.js'

export const healthRoutes: FastifyPluginAsyncZodOpenApi = async (app) => {
  app.get(
    '/health',
    {
      schema: {
        tags: ['system'],
        summary: 'Check service health',
        response: {
          200: healthResponseSchema,
        },
      } satisfies FastifyZodOpenApiSchema,
    },
    async () => getHealthStatus(),
  )
}
