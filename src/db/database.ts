import { PGlite } from '@electric-sql/pglite'
import { Kysely, PGliteDialect } from 'kysely'
import { mkdirSync } from 'node:fs'

import type { Database } from './types.js'

export interface CreateDatabaseOptions {
  dataDir?: string
}

export function createDatabase(
  options: CreateDatabaseOptions = {},
): Kysely<Database> {
  let pglite: PGlite

  if (options.dataDir) {
    mkdirSync(options.dataDir, { recursive: true })
    pglite = new PGlite(options.dataDir)
  } else {
    pglite = new PGlite()
  }

  return new Kysely<Database>({
    dialect: new PGliteDialect({ pglite }),
  })
}
