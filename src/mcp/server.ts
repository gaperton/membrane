import {
  createMcpHandler,
  McpServer,
  type McpHttpHandler,
} from '@modelcontextprotocol/server'
import * as z from 'zod/v4'

import {
  getHealthStatus,
  healthResponseShape,
} from '../application/health.js'

const mcpHealthOutputSchema = z.object(healthResponseShape)

export function createMembraneMcpServer(): McpServer {
  const server = new McpServer({
    name: 'membrane',
    version: '0.1.0',
  })

  server.registerTool(
    'health',
    {
      title: 'Service health',
      description: 'Return the current Membrane service health status.',
      inputSchema: z.object({}),
      outputSchema: mcpHealthOutputSchema,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => {
      const health = getHealthStatus()

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(health),
          },
        ],
        structuredContent: health,
      }
    },
  )

  return server
}

export function createMembraneMcpHttpHandler(): McpHttpHandler {
  return createMcpHandler(() => createMembraneMcpServer())
}
