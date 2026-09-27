// scripts/migrate-quiz-default-attempts.ts
// Set default quiz max_attempts = 1 untuk quiz lama yang masih null (unlimited).
import Database from 'better-sqlite3'

const sqlite = new Database('./server/database/local.db')

const cols = sqlite.prepare("PRAGMA table_info('activities')").all() as { name: string }[]
if (!cols.some(c => c.name === 'max_attempts')) {
  console.log('— activities.max_attempts belum ada, skip')
  sqlite.close()
  process.exit(0)
}

const pending = sqlite.prepare(
  "SELECT id, title FROM activities WHERE type='quiz' AND max_attempts IS NULL"
).all() as { id: string; title: string }[]

if (!pending.length) {
  console.log('— Tidak ada quiz dengan max_attempts NULL')
} else {
  const upd = sqlite.prepare("UPDATE activities SET max_attempts = 1 WHERE id = ?")
  const tx = sqlite.transaction(() => {
    for (const row of pending) upd.run(row.id)
  })
  tx()
  console.log(`✔ ${pending.length} quiz diubah max_attempts NULL → 1:`)
  for (const r of pending) console.log(`  - ${r.id} — ${r.title}`)
}

sqlite.close()
console.log('✅ Migration selesai')
