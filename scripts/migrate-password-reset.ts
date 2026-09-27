import Database from 'better-sqlite3'

const sqlite = new Database(process.env.SQLITE_PATH || './server/database/local.db')
sqlite.exec(`CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token_hash TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
)`)
console.log('password_reset_tokens ready')
sqlite.close()
