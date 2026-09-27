// Migrasi fitur Kalender Akademik:
// 1. Buat tabel calendar_events bila belum ada (dengan kolom lengkap).
// 2. Tambah kolom baru (type, category, is_holiday, visibility, color, updated_at)
//    ke tabel existing TANPA menghapus data.
import Database from 'better-sqlite3'

const sqlite = new Database('./server/database/local.db')

function tableExists(name: string): boolean {
  const row = sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?")
    .get(name) as { name: string } | undefined
  return !!row
}

function columnExists(table: string, column: string): boolean {
  const cols = sqlite.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]
  return cols.some((c) => c.name === column)
}

// 1. Pastikan tabel ada
if (!tableExists('calendar_events')) {
  sqlite.exec(`
    CREATE TABLE calendar_events (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      start_date TEXT NOT NULL,
      end_date TEXT,
      location TEXT,
      type TEXT NOT NULL DEFAULT 'other',
      category TEXT,
      is_holiday INTEGER NOT NULL DEFAULT 0,
      visibility TEXT NOT NULL DEFAULT 'public',
      color TEXT,
      created_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `)
  console.log('  ✔ tabel calendar_events dibuat')
} else {
  // 2. Tambah kolom baru bila belum ada (ALTER TABLE ADD COLUMN aman di SQLite)
  const columns: [string, string][] = [
    ['type', "TEXT NOT NULL DEFAULT 'other'"],
    ['category', 'TEXT'],
    ['is_holiday', 'INTEGER NOT NULL DEFAULT 0'],
    ['visibility', "TEXT NOT NULL DEFAULT 'public'"],
    ['color', 'TEXT'],
    ['updated_at', 'INTEGER'],
  ]
  for (const [name, def] of columns) {
    if (!columnExists('calendar_events', name)) {
      sqlite.exec(`ALTER TABLE calendar_events ADD COLUMN ${name} ${def};`)
      console.log(`  ✔ kolom ${name} ditambahkan`)
    }
  }
  // Isi updated_at yang null
  sqlite.exec(`UPDATE calendar_events SET updated_at = created_at WHERE updated_at IS NULL;`)
}

// 3. Index untuk query rentang tanggal & tipe
sqlite.exec(`
  CREATE INDEX IF NOT EXISTS calendar_start_date_idx ON calendar_events(start_date);
  CREATE INDEX IF NOT EXISTS calendar_type_idx ON calendar_events(type);
`)

sqlite.close()
console.log('✅ Migration kalender akademik selesai')
