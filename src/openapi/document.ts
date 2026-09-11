import { buildApp } from '../app.js'
import { createDatabase } from '../db/database.js'
import { migrateToLatest } from '../db/migrator.js'

/**
 * Path of the committed OpenAPI document, relative to the repository root.
 * The Swift client's code generator reads it from the package source tree.
 */
export const openApiDocumentPath =
  'swift/Sources/MembraneClient/openapi.json'

/**
 * Builds the application against a throwaway in-memory database purely to read
 * the OpenAPI document its route schemas generate. Nothing is written to the
 * configured data directory.
 */
export async function generateOpenApiDocument(): Promise<unknown> {
  const database = createDatabase()

  await migrateToLatest(database)

  const app = await buildApp({ database })

  try {
    await app.ready()

    return app.swagger()
  } finally {
    await app.close()
  }
}

export function serializeOpenApiDocument(document: unknown): string {
  return `${JSON.stringify(document, null, 2)}\n`
}
