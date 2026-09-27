import { sql } from 'drizzle-orm'
import { db } from '~~/server/utils/db'

export default defineEventHandler(async () => {
  try {
    await (db as any).run(sql`select 1`)
    return { ok: true, db: 'ok', timestamp: new Date().toISOString() }
  } catch {
    throw createError({ statusCode: 503, statusMessage: 'Database tidak tersedia' })
  }
})
