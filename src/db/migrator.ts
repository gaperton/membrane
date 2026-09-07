import type { Kysely } from 'kysely'
import { Migrator, type MigrationResult } from 'kysely/migration'

import { migrationProvider } from './migrations/index.js'
import type { Database } from './types.js'

export async function migrateToLatest(
  database: Kysely<Database>,
): Promise<readonly MigrationResult[]> {
  const migrator = new Migrator({
    db: database,
    provider: migrationProvider,
  })
  const { error, results = [] } = await migrator.migrateToLatest()

  if (error) {
    throw new Error('Database migration failed', { cause: error })
  }

  return results
}
