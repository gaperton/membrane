import { loadConfig } from '../config.js'
import { createDatabase } from './database.js'
import { migrateToLatest } from './migrator.js'

const config = loadConfig()
const database = createDatabase({ dataDir: config.PGLITE_DATA_DIR })

try {
  const results = await migrateToLatest(database)

  for (const result of results) {
    console.log(`${result.status}: ${result.migrationName}`)
  }
} catch (error) {
  console.error(error)
  process.exitCode = 1
} finally {
  await database.destroy()
}
