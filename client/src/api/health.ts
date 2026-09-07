import {
  healthResponseSchema,
  type HealthResponse,
} from '@server/application/health.js'

/**
 * Reads `GET /health` and validates it against the same Zod contract the
 * service uses to serialize the response, so the client cannot drift from the
 * documented shape.
 */
export async function fetchHealth(
  signal: AbortSignal,
): Promise<HealthResponse> {
  const response = await fetch('/health', {
    headers: { accept: 'application/json' },
    signal,
  })

  if (!response.ok) {
    throw new Error(`Health request failed with status ${response.status}`)
  }

  return healthResponseSchema.parse(await response.json())
}
