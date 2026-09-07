import type { Migration, MigrationProvider } from 'kysely/migration'

import * as initial from './001_initial.js'

const migrations: Record<string, Migration> = {
  '001_initial': initial,
}

export const migrationProvider: MigrationProvider = {
  async getMigrations() {
    return migrations
  },
}
