import type { Kysely } from 'kysely'

import type { Database } from '../db/types.js'

declare module 'fastify' {
  interface FastifyInstance {
    database: Kysely<Database>
  }
}
