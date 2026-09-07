import {
  type FastifyPluginAsyncZodOpenApi,
  type FastifyZodOpenApiSchema,
} from 'fastify-zod-openapi'
import * as z from 'zod/v4'

const healthResponseSchema = z
  .object({
    status: z.literal('ok'),
  })
  .meta({
    id: 'HealthResponse',
    description: 'Service health status',
  })

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
    async () => ({ status: 'ok' as const }),
  )
}
