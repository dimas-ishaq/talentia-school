// scripts/migrate-attendance-subject.ts
// Absensi menjadi PER MATA PELAJARAN:
//  - tambah kolom subject_id (nullable, data lama tetap aman)
//  - ganti unique index lama (student_id, date) → (student_id, subject_id, date)
import Database from 'better-sqlite3'

const sqlite = new Database('./server/database/local.db')

const columns = sqlite.prepare("PRAGMA table_info('attendance')").all() as { name: string }[]
const existing = new Set(columns.map((c) => c.name))

if (!existing.has('subject_id')) {
  sqlite.prepare('ALTER TABLE attendance ADD COLUMN subject_id text REFERENCES subjects(id)').run()
  console.log('✔ attendance.subject_id ditambahkan')
} else {
  console.log('— attendance.subject_id sudah ada')
}

// Hapus index unik lama (student, date) agar bisa ada beberapa mapel per hari.
sqlite.prepare('DROP INDEX IF EXISTS attendance_student_date_idx').run()
// Index unik baru: satu catatan per siswa + mapel + tanggal.
sqlite.prepare(
  'CREATE UNIQUE INDEX IF NOT EXISTS attendance_student_subject_date_idx ON attendance (student_id, subject_id, date)',
).run()
console.log('✔ index unik absensi (student, subject, date) siap')

sqlite.close()
console.log('✅ Migration attendance per-mapel selesai')
