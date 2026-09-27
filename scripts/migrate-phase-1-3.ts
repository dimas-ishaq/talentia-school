// Idempotent schema migration for LMS phases 1-3.
import Database from 'better-sqlite3'
import { Client } from 'pg'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const isPostgres = process.env.DATABASE_URL?.startsWith('postgres')
const sqlitePath = resolve(process.env.SQLITE_PATH || './server/database/local.db')

const sqliteColumns = [
  ['activities', 'passing_score', 'real'],
  ['activities', 'allow_late_submission', 'integer NOT NULL DEFAULT 1'],
  ['activity_progress', 'is_late', 'integer NOT NULL DEFAULT 0'],
  ['activity_progress', 'returned_at', 'integer'],
  ['activity_progress', 'return_reason', 'text'],
  ['activity_progress', 'score_published_at', 'integer'],
  ['final_grades', 'published_at', 'integer'],
] as const

const pgColumns = [
  ['activities', 'passing_score', 'real'],
  ['activities', 'allow_late_submission', 'boolean NOT NULL DEFAULT true'],
  ['activity_progress', 'is_late', 'boolean NOT NULL DEFAULT false'],
  ['activity_progress', 'returned_at', 'timestamp'],
  ['activity_progress', 'return_reason', 'text'],
  ['activity_progress', 'score_published_at', 'timestamp'],
  ['final_grades', 'published_at', 'timestamp'],
] as const

async function sqlite() {
  if (!existsSync(sqlitePath)) { console.warn(`[phase-1-3] SQLite tidak ditemukan: ${sqlitePath}`); return }
  const db = new Database(sqlitePath)
  for (const [table, column, type] of sqliteColumns) {
    const existing = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]
    if (!existing.some((x) => x.name === column)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`)
      console.log(`[phase-1-3] SQLite + ${table}.${column}`)
    }
  }
  db.close()
}

async function postgres() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  try {
    for (const [table, column, type] of pgColumns) {
      const { rows } = await client.query<{ column_name: string }>(
        'SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND column_name = $2',
        [table, column],
      )
      if (!rows.length) {
        await client.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`)
        console.log(`[phase-1-3] Postgres + ${table}.${column}`)
      }
    }
  } finally { await client.end() }
}

try {
  if (isPostgres) await postgres()
  else await sqlite()
  console.log('[phase-1-3] Migrasi selesai.')
} catch (error) {
  console.error('[phase-1-3] Gagal:', error)
  process.exit(1)
}
