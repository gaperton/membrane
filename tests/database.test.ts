import { mkdtemp, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { createDatabase } from '../src/db/database.js'
import { migrateToLatest } from '../src/db/migrator.js'

describe('persistent PGlite database', () => {
  let temporaryDirectory: string | undefined

  afterEach(async () => {
    if (temporaryDirectory) {
      await rm(temporaryDirectory, { force: true, recursive: true })
    }
  })

  it('creates a nested data directory and applies migrations', async () => {
    temporaryDirectory = await mkdtemp(
      path.join(tmpdir(), 'membrane-pglite-'),
    )
    const dataDir = path.join(temporaryDirectory, 'nested', 'database')
    const database = createDatabase({ dataDir })

    try {
      await migrateToLatest(database)

      expect((await stat(dataDir)).isDirectory()).toBe(true)
      const tables = await database.introspection.getTables()
      expect(tables.map((table) => table.name)).toContain('app_metadata')
    } finally {
      await database.destroy()
    }
  })
})
