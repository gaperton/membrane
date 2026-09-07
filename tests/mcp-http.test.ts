import { LATEST_PROTOCOL_VERSION } from '@modelcontextprotocol/server'
import type { FastifyInstance } from 'fastify'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { buildApp } from '../src/app.js'
import { createDatabase } from '../src/db/database.js'
import { migrateToLatest } from '../src/db/migrator.js'

function parseSseMessage(body: string): unknown {
  const dataLine = body
    .split('\n')
    .find((line) => line.startsWith('data: '))

  if (!dataLine) {
    throw new Error('MCP response did not contain an SSE data event')
  }

  return JSON.parse(dataLine.slice('data: '.length))
}

describe('MCP Streamable HTTP endpoint', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    const database = createDatabase()
    await migrateToLatest(database)
    app = await buildApp({ database })
  })

  afterEach(async () => {
    await app.close()
  })

  it('accepts an MCP initialization request', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/mcp',
      headers: {
        accept: 'application/json, text/event-stream',
        'content-type': 'application/json',
        host: 'localhost',
      },
      payload: {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: LATEST_PROTOCOL_VERSION,
          capabilities: {},
          clientInfo: {
            name: 'membrane-test',
            version: '0.1.0',
          },
        },
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.headers['content-type']).toContain('text/event-stream')
    expect(parseSseMessage(response.body)).toMatchObject({
      jsonrpc: '2.0',
      id: 1,
      result: {
        serverInfo: {
          name: 'membrane',
          version: '0.1.0',
        },
      },
    })
  })

  it('rejects requests with an untrusted Host header', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/mcp',
      headers: {
        accept: 'application/json, text/event-stream',
        'content-type': 'application/json',
        host: 'attacker.example',
      },
      payload: {},
    })

    expect(response.statusCode).toBe(403)
  })

  it('rejects requests with an untrusted Origin header', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/mcp',
      headers: {
        accept: 'application/json, text/event-stream',
        'content-type': 'application/json',
        host: 'localhost',
        origin: 'https://attacker.example',
      },
      payload: {},
    })

    expect(response.statusCode).toBe(403)
  })
})
