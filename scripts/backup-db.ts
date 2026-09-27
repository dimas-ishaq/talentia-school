import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { basename, dirname, resolve } from 'node:path'

const source = resolve(process.env.SQLITE_PATH || './server/database/local.db')
if (!existsSync(source)) throw new Error(`Database tidak ditemukan: ${source}`)
const dir = resolve(process.env.BACKUP_DIR || './backups')
mkdirSync(dir, { recursive: true })
const target = resolve(dir, `${basename(source, '.db')}.${new Date().toISOString().replace(/[:.]/g, '-')}.db`)
copyFileSync(source, target)
console.log(`Backup dibuat: ${target}`)
