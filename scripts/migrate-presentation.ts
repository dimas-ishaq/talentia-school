// scripts/migrate-presentation.ts
// Tambah kolom presentasi ke tabel activities (idempotent untuk SQLite/Postgres).
// Jalankan: npm run db:migrate:presentation
import Database from 'better-sqlite3'
import { Client } from 'pg'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const isPostgres = !!process.env.DATABASE_URL?.startsWith('postgres')
const SQLITE_PATH = process.env.SQLITE_PATH || './server/database/local.db'

async function runSqlite() {
  const abs = resolve(SQLITE_PATH)
  if (!existsSync(abs)) {
    console.warn(`[presentation] SQLite tidak ditemukan di ${abs}, lewati.`)
    return
  }
  const db = new Database(abs)
  const columns = db.prepare("PRAGMA table_info(activities)").all() as { name: string }[]
  const has = (name: string) => columns.some((c) => c.name === name)
  const tasks: string[] = []
  if (!has('presentation_source')) tasks.push("ALTER TABLE activities ADD COLUMN presentation_source text")
  if (!has('presentation_file_url')) tasks.push("ALTER TABLE activities ADD COLUMN presentation_file_url text")
  if (!has('presentation_original_url')) tasks.push("ALTER TABLE activities ADD COLUMN presentation_original_url text")
  if (!has('presentation_page_count')) tasks.push("ALTER TABLE activities ADD COLUMN presentation_page_count integer")
  for (const sql of tasks) db.exec(sql)
  console.log(`[presentation] SQLite columns added: ${tasks.length}`)
  db.close()
}

async function runPostgres() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  try {
    const { rows } = await client.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'activities'`,
    )
    const have = new Set(rows.map((r) => r.column_name))
    const tasks: string[] = []
    if (!have.has('presentation_source')) tasks.push('ALTER TABLE activities ADD COLUMN presentation_source text')
    if (!have.has('presentation_file_url')) tasks.push('ALTER TABLE activities ADD COLUMN presentation_file_url text')
    if (!have.has('presentation_original_url')) tasks.push('ALTER TABLE activities ADD COLUMN presentation_original_url text')
    if (!have.has('presentation_page_count')) tasks.push('ALTER TABLE activities ADD COLUMN presentation_page_count integer')
    for (const sql of tasks) await client.query(sql)
    console.log(`[presentation] Postgres columns added: ${tasks.length}`)
  } finally {
    await client.end()
  }
}

;(async () => {
  try {
    if (isPostgres) await runPostgres()
    else await runSqlite()
    console.log('[presentation] Migrasi selesai.')
  } catch (error) {
    console.error('[presentation] Gagal migrasi:', error)
    process.exit(1)
  }
})()