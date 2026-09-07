import {
  hostHeaderValidation,
  originValidation,
} from '@modelcontextprotocol/fastify'
import { toNodeHandler } from '@modelcontextprotocol/node'
import type { McpHttpHandler } from '@modelcontextprotocol/server'
import type { FastifyPluginAsync } from 'fastify'

export const defaultMcpAllowedHosts = [
  'localhost',
  '127.0.0.1',
  '[::1]',
]

export interface McpRoutesOptions {
  allowedHosts: string[]
  handler: McpHttpHandler
}

export const mcpRoutes: FastifyPluginAsync<McpRoutesOptions> = async (
  app,
  options,
) => {
  app.addHook('onRequest', hostHeaderValidation(options.allowedHosts))
  app.addHook('onRequest', originValidation(options.allowedHosts))

  const nodeHandler = toNodeHandler(options.handler, {
    onerror(error) {
      app.log.error({ err: error }, 'MCP HTTP handler failed')
    },
  })

  app.route({
    method: ['GET', 'POST', 'DELETE'],
    url: '/mcp',
    schema: {
      hide: true,
    },
    async handler(request, reply) {
      reply.hijack()
      const nodeRequest = Object.assign(request.raw, {
        method: request.method,
        url: request.url,
      })
      await nodeHandler(nodeRequest, reply.raw, request.body)
    },
  })
}
