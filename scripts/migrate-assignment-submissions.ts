// Tambah metadata submission assignment. Idempotent SQLite/Postgres.
import Database from 'better-sqlite3'
import { Client } from 'pg'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const sqlitePath = resolve(process.env.SQLITE_PATH || './server/database/local.db')
const isPostgres = !!process.env.DATABASE_URL?.startsWith('postgres')
const columns = ['submission_files text', 'submission_link text']

async function main() {
  if (isPostgres) {
    const client = new Client({ connectionString: process.env.DATABASE_URL }); await client.connect()
    try { for (const c of columns) await client.query(`ALTER TABLE activity_progress ADD COLUMN IF NOT EXISTS ${c}`) }
    finally { await client.end() }
  } else if (existsSync(sqlitePath)) {
    const db = new Database(sqlitePath)
    const have = new Set((db.prepare('PRAGMA table_info(activity_progress)').all() as { name: string }[]).map(c => c.name))
    for (const c of columns) { const name = c.split(' ')[0]; if (!have.has(name)) db.exec(`ALTER TABLE activity_progress ADD COLUMN ${c}`) }
    db.close()
  } else console.warn(`[assignment] SQLite tidak ditemukan di ${sqlitePath}, lewati.`)
  console.log('[assignment] Migrasi selesai.')
}
main().catch((error) => { console.error('[assignment] Gagal migrasi:', error); process.exit(1) })
