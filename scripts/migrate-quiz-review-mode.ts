// Add answer-review visibility for existing quizzes.
import Database from 'better-sqlite3'

const sqlite = new Database('./server/database/local.db')
const columns = sqlite.prepare("PRAGMA table_info('activities')").all() as { name: string }[]

if (!columns.some((column) => column.name === 'review_mode')) {
  sqlite.exec("ALTER TABLE activities ADD COLUMN review_mode TEXT NOT NULL DEFAULT 'immediate'")
  console.log('Added activities.review_mode')
} else {
  console.log('activities.review_mode already exists')
}

sqlite.close()
