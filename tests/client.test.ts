import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import type { FastifyInstance } from 'fastify'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { buildApp } from '../src/app.js'
import { createDatabase } from '../src/db/database.js'
import { migrateToLatest } from '../src/db/migrator.js'

const indexHtml =
  '<!doctype html><html><body><div id="root"></div></body></html>'

async function createClientDist(): Promise<string> {
  const distDir = await mkdtemp(join(tmpdir(), 'membrane-client-'))

  await mkdir(join(distDir, 'assets'))
  await writeFile(join(distDir, 'index.html'), indexHtml, 'utf8')
  await writeFile(
    join(distDir, 'assets', 'index-abc123.js'),
    'export const membrane = true\n',
    'utf8',
  )

  return distDir
}

async function createApp(clientDistDir: string): Promise<FastifyInstance> {
  const database = createDatabase()
  await migrateToLatest(database)

  return buildApp({ database, clientDistDir })
}

describe('single-page application hosting', () => {
  let app: FastifyInstance
  let distDir: string

  beforeEach(async () => {
    distDir = await createClientDist()
    app = await createApp(distDir)
  })

  afterEach(async () => {
    await app.close()
    await rm(distDir, { recursive: true, force: true })
  })

  it('serves the application shell at the site root', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/',
      headers: { accept: 'text/html' },
    })

    expect(response.statusCode).toBe(200)
    expect(response.headers['content-type']).toContain('text/html')
    expect(response.body).toContain('<div id="root">')
  })

  it('serves the shell for an unknown client-side route', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/settings/profile',
      headers: { accept: 'text/html' },
    })

    expect(response.statusCode).toBe(200)
    expect(response.body).toContain('<div id="root">')
  })

  it('marks hashed assets as immutable and the shell as revalidated', async () => {
    const asset = await app.inject({
      method: 'GET',
      url: '/assets/index-abc123.js',
    })

    expect(asset.statusCode).toBe(200)
    expect(asset.headers['cache-control']).toBe(
      'public, max-age=31536000, immutable',
    )

    const shell = await app.inject({
      method: 'GET',
      url: '/index.html',
      headers: { accept: 'text/html' },
    })

    expect(shell.headers['cache-control']).toBe('no-cache')
  })

  it('keeps serving the API and its documentation', async () => {
    const health = await app.inject({ method: 'GET', url: '/health' })

    expect(health.statusCode).toBe(200)
    expect(health.json()).toEqual({ status: 'ok' })

    const document = await app.inject({ method: 'GET', url: '/docs/json' })

    expect(document.statusCode).toBe(200)
  })

  it('does not answer unknown API paths with the shell', async () => {
    for (const url of ['/health/unknown', '/docs/nope', '/mcp/nope']) {
      const response = await app.inject({
        method: 'GET',
        url,
        headers: { accept: 'text/html' },
      })

      expect(response.statusCode).toBe(404)
      expect(response.body).not.toContain('<div id="root">')
    }
  })

  it('does not answer data requests or writes with the shell', async () => {
    const jsonRequest = await app.inject({
      method: 'GET',
      url: '/unknown',
      headers: { accept: 'application/json' },
    })

    expect(jsonRequest.statusCode).toBe(404)
    expect(jsonRequest.body).not.toContain('<div id="root">')

    const writeRequest = await app.inject({
      method: 'POST',
      url: '/unknown',
      headers: { accept: 'text/html' },
    })

    expect(writeRequest.statusCode).toBe(404)
    expect(writeRequest.body).not.toContain('<div id="root">')
  })
})

describe('single-page application hosting without a build', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await createApp(join(tmpdir(), 'membrane-client-absent'))
  })

  afterEach(async () => {
    await app.close()
  })

  it('still serves the API when the client bundle is missing', async () => {
    const health = await app.inject({ method: 'GET', url: '/health' })

    expect(health.statusCode).toBe(200)

    const shell = await app.inject({
      method: 'GET',
      url: '/',
      headers: { accept: 'text/html' },
    })

    expect(shell.statusCode).toBe(404)
  })
})
