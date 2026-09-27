// Tambah tabel jadwal mingguan per kelas tanpa menghapus data existing.
import Database from 'better-sqlite3'

const sqlite = new Database('./server/database/local.db')
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS schedule_entries (
    id TEXT PRIMARY KEY NOT NULL,
    day_of_week INTEGER NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
    class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    teacher_id TEXT REFERENCES teachers(id) ON DELETE SET NULL,
    room TEXT,
    note TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS schedule_class_day_idx ON schedule_entries(class_id, day_of_week);
  CREATE INDEX IF NOT EXISTS schedule_teacher_day_idx ON schedule_entries(teacher_id, day_of_week);
`)
sqlite.close()
console.log('✅ Migration jadwal selesai')
