// scripts/migrate-reading-features.ts
// Tambah kolom objectives, reading_minutes, attachments untuk activity type text/bacaan
import Database from 'better-sqlite3'

const sqlite = new Database('./server/database/local.db')

const columns = sqlite.prepare("PRAGMA table_info('activities')").all() as { name: string }[]
const existing = new Set(columns.map((c) => c.name))

if (!existing.has('objectives')) {
  sqlite.prepare("ALTER TABLE activities ADD COLUMN objectives text").run()
  console.log('✔ activities.objectives added')
} else {
  console.log('— activities.objectives already exists')
}

if (!existing.has('reading_minutes')) {
  sqlite.prepare("ALTER TABLE activities ADD COLUMN reading_minutes integer").run()
  console.log('✔ activities.reading_minutes added')
} else {
  console.log('— activities.reading_minutes already exists')
}

if (!existing.has('attachments')) {
  sqlite.prepare("ALTER TABLE activities ADD COLUMN attachments text").run()
  console.log('✔ activities.attachments added')
} else {
  console.log('— activities.attachments already exists')
}

// Kolom progress baca siswa
const progressCols = sqlite.prepare("PRAGMA table_info('activity_progress')").all() as { name: string }[]
const existingProgress = new Set(progressCols.map((c) => c.name))

if (!existingProgress.has('completed_at')) {
  sqlite.prepare("ALTER TABLE activity_progress ADD COLUMN completed_at integer").run()
  console.log('✔ activity_progress.completed_at added')
} else {
  console.log('— activity_progress.completed_at already exists')
}

sqlite.close()
console.log('✅ Migration selesai')
