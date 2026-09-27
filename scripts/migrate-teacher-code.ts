// scripts/migrate-teacher-code.ts
// Tambah kolom `code` (kode guru) pada tabel teachers
import Database from 'better-sqlite3'

const sqlite = new Database('./server/database/local.db')

const columns = sqlite.prepare("PRAGMA table_info('teachers')").all() as { name: string }[]
const existing = new Set(columns.map((c) => c.name))

if (!existing.has('code')) {
  sqlite.prepare("ALTER TABLE teachers ADD COLUMN code text").run()
  sqlite.prepare("CREATE UNIQUE INDEX IF NOT EXISTS teachers_code_unique ON teachers (code)").run()
  console.log('✔ teachers.code added (+ unique index)')
} else {
  console.log('— teachers.code already exists')
}

// Isi kode otomatis untuk guru lama yang belum punya kode
const rows = sqlite.prepare("SELECT id FROM teachers WHERE code IS NULL OR code = ''").all() as { id: string }[]
let seq = 0
for (const row of rows) {
  seq += 1
  const code = `G${String(seq).padStart(3, '0')}`
  sqlite.prepare('UPDATE teachers SET code = ? WHERE id = ?').run(code, row.id)
  console.log(`  ✔ ${row.id} → ${code}`)
}

sqlite.close()
console.log('✅ Migration teacher code selesai')
