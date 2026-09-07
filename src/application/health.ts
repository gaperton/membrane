import * as z from 'zod/v4'

export const healthResponseShape = {
  status: z.literal('ok'),
}

export const healthResponseSchema = z
  .object(healthResponseShape)
  .meta({
    id: 'HealthResponse',
    description: 'Service health status',
  })

export type HealthResponse = z.infer<typeof healthResponseSchema>

export function getHealthStatus(): HealthResponse {
  return { status: 'ok' }
}
