import Database from 'better-sqlite3'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const resolved = resolve(process.env.BACKUP_PATH || process.argv[2] || '')
if (!resolved || !existsSync(resolved)) throw new Error('BACKUP_PATH atau path backup wajib diisi')

// Postgres custom dump (.dump): validasi via pg_restore --list; SQLite file via integrity_check
if (resolved.endsWith('.dump')) {
  const r = spawnSync('pg_restore', ['--list', resolved], { encoding: 'utf8' })
  if (r.status !== 0) throw new Error(`pg_restore --list gagal: ${r.stderr}`)
  if (!r.stdout.includes('TABLE')) throw new Error('Dump tidak berisi tabel')
  console.log(`Backup Postgres valid: ${resolved}`)
} else {
  const db = new Database(resolved, { readonly: true })
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[]
  if (!tables.some((table) => table.name === 'users')) throw new Error('Backup tidak valid: tabel users tidak ditemukan')
  db.prepare('PRAGMA integrity_check').get()
  db.close()
  console.log(`Backup valid: ${resolved}`)
}
