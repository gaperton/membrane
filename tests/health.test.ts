import type { FastifyInstance } from 'fastify'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import * as z from 'zod/v4'

import { buildApp } from '../src/app.js'
import { createDatabase } from '../src/db/database.js'
import { migrateToLatest } from '../src/db/migrator.js'

const openApiHealthDocumentSchema = z.object({
  openapi: z.literal('3.1.0'),
  paths: z.object({
    '/health': z.object({
      get: z.object({
        responses: z.object({
          '200': z.unknown(),
        }),
      }),
    }),
  }),
})

describe('GET /health', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    const database = createDatabase()
    await migrateToLatest(database)
    app = await buildApp({ database })
  })

  afterEach(async () => {
    await app.close()
  })

  it('reports that the service is healthy and documents the response', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ status: 'ok' })

    const document = openApiHealthDocumentSchema.parse(app.swagger())
    expect(document.openapi).toBe('3.1.0')
    expect(document.paths['/health'].get.responses).toHaveProperty('200')
  })
})
