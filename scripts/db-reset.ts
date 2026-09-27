// scripts/db-reset.ts
import { existsSync, unlinkSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { resolve } from 'node:path'

const DB_PATH = resolve('./server/database/local.db')

function log(msg: string) {
  console.log(`\x1b[36m▸\x1b[0m ${msg}`)
}

function success(msg: string) {
  console.log(`\x1b[32m✓\x1b[0m ${msg}`)
}

function error(msg: string) {
  console.log(`\x1b[31m✗\x1b[0m ${msg}`)
}

async function main() {
  console.log('\n\x1b[1m🔄 Reset Database\x1b[0m\n')

  // 1. Hapus file database
  log('Menghapus database lama...')
  if (existsSync(DB_PATH)) {
    unlinkSync(DB_PATH)
    success(`Database dihapus: ${DB_PATH}`)
  } else {
    console.log('  (tidak ada database lama)')
  }

  // 2. Push schema
  log('Push schema...')
  try {
    execSync('npx drizzle-kit push --force', { stdio: 'inherit' })
    success('Schema berhasil di-push')
  } catch {
    error('Gagal push schema')
    process.exit(1)
  }

  // 3. Seed
  log('Seeding data...')
  try {
    execSync('npx tsx server/database/seed.ts', { stdio: 'inherit' })
    success('Seed selesai')
  } catch {
    error('Gagal seed')
    process.exit(1)
  }

  console.log('\n\x1b[32m✓ Database siap digunakan!\x1b[0m\n')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})