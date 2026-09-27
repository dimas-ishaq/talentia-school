import Database from 'better-sqlite3'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const path = resolve(process.env.BACKUP_PATH || process.argv[2] || '')
if (!path || !existsSync(path)) throw new Error('BACKUP_PATH atau path backup wajib diisi')
const db = new Database(path, { readonly: true })
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[]
if (!tables.some((table) => table.name === 'users')) throw new Error('Backup tidak valid: tabel users tidak ditemukan')
db.prepare('PRAGMA integrity_check').get()
db.close()
console.log(`Backup valid: ${path}`)
