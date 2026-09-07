import { constants } from 'node:fs'
import { access } from 'node:fs/promises'
import { join, resolve, sep } from 'node:path'

import fastifyStatic from '@fastify/static'
import type { FastifyPluginAsync, FastifyRequest } from 'fastify'

export interface ClientRoutesOptions {
  distDir: string
}

/**
 * URL prefixes owned by the API. Requests below them must never fall back to
 * the application shell, so an unknown API path still answers 404.
 */
const apiPrefixes = ['/health', '/mcp', '/docs']

const hashedAssetSegment = `${sep}assets${sep}`

async function hasBuiltClient(root: string): Promise<boolean> {
  try {
    await access(join(root, 'index.html'), constants.R_OK)
    return true
  } catch {
    return false
  }
}

function isApiRequest(request: FastifyRequest): boolean {
  const path = request.url.split('?')[0] ?? '/'

  return apiPrefixes.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  )
}

function acceptsHtml(request: FastifyRequest): boolean {
  const accept = request.headers.accept

  if (accept === undefined) {
    return true
  }

  return accept.includes('text/html') || accept.includes('*/*')
}

/**
 * Serves the built single-page application and lets client-side routes resolve
 * to its shell. Registration is skipped when the bundle has not been built,
 * which keeps `npm run dev` usable while Vite serves the client itself.
 */
export const clientRoutes: FastifyPluginAsync<ClientRoutesOptions> = async (
  app,
  options,
) => {
  const root = resolve(options.distDir)

  if (!(await hasBuiltClient(root))) {
    app.log.warn(
      { distDir: root },
      'Client bundle not found; serving API routes only',
    )
    return
  }

  await app.register(fastifyStatic, {
    root,
    wildcard: false,
    setHeaders(reply, path) {
      reply.header(
        'cache-control',
        path.includes(hashedAssetSegment)
          ? 'public, max-age=31536000, immutable'
          : 'no-cache',
      )
    },
  })

  app.setNotFoundHandler(async (request, reply) => {
    const isDocumentRequest =
      (request.method === 'GET' || request.method === 'HEAD') &&
      !isApiRequest(request) &&
      acceptsHtml(request)

    if (!isDocumentRequest) {
      return reply.code(404).send({ message: 'Not Found' })
    }

    return reply.code(200).sendFile('index.html')
  })
}
