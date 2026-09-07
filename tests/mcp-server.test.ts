import {
  Client,
  InMemoryTransport,
} from '@modelcontextprotocol/client'
import type { McpServer } from '@modelcontextprotocol/server'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createMembraneMcpServer } from '../src/mcp/server.js'

describe('Membrane MCP server', () => {
  let client: Client
  let server: McpServer

  beforeEach(async () => {
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair()

    client = new Client({
      name: 'membrane-test',
      version: '0.1.0',
    })
    server = createMembraneMcpServer()

    await server.connect(serverTransport)
    await client.connect(clientTransport)
  })

  afterEach(async () => {
    await client.close()
    await server.close()
  })

  it('lists and calls the health tool', async () => {
    const { tools } = await client.listTools()
    const healthTool = tools.find((tool) => tool.name === 'health')

    expect(healthTool).toMatchObject({
      name: 'health',
      title: 'Service health',
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    })

    const result = await client.callTool({
      name: 'health',
      arguments: {},
    })

    expect(result.structuredContent).toEqual({ status: 'ok' })
    expect(result.content).toEqual([
      {
        type: 'text',
        text: '{"status":"ok"}',
      },
    ])
  })
})
