import Database from 'better-sqlite3'

const sqlite = new Database(process.env.SQLITE_PATH || './server/database/local.db')
const columns = sqlite.prepare("PRAGMA table_info('users')").all() as { name: string }[]

if (!columns.some((column) => column.name === 'must_change_password')) {
  sqlite.exec("ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0")
  console.log('Added users.must_change_password')
} else {
  console.log('users.must_change_password already exists')
}

sqlite.close()
