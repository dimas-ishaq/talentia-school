// Verifikasi implementasi fitur Kalender Akademik
import Database from 'better-sqlite3'

console.log('🔍 Memverifikasi Kalender Akademik...\n')

const sqlite = new Database('./server/database/local.db')

// 1. Check table exists
const hasTable = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = 'calendar_events'").get()
if (!hasTable) {
  console.error('❌ Tabel calendar_events tidak ditemukan')
  process.exit(1)
}
console.log('✔ Tabel calendar_events exist')

// 2. Check columns
const cols = sqlite.prepare('PRAGMA table_info(calendar_events)').all() as { name: string }[]
const requiredCols = ['id', 'title', 'description', 'start_date', 'end_date', 'location', 'type', 'category', 'is_holiday', 'visibility', 'color', 'created_by', 'created_at', 'updated_at']
for (const col of requiredCols) {
  if (!cols.some((c) => c.name === col)) {
    console.error(`❌ Kolom ${col} tidak ditemukan`)
    process.exit(1)
  }
}
console.log('✔ Semua kolom diperlukan ada')

// 3. Check indexes
const indexes = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name = 'calendar_events'").all() as { name: string }[]
const neededIndexes = ['calendar_start_date_idx', 'calendar_type_idx']
for (const idx of neededIndexes) {
  if (!indexes.some((i) => i.name.includes(idx))) {
    console.warn(`⚠️ Index ${idx} belum dibuat (tidak kritis untuk basic functionality)`)
  }
}

// 4. Count data
const count = sqlite.prepare("SELECT COUNT(*) as cnt FROM calendar_events").get() as { cnt: number }
console.log(`📊 Jumlah agenda di DB: ${count.cnt}`)

// 5. Check sample events if any
const samples = sqlite.prepare(`SELECT title, start_date, type FROM calendar_events LIMIT 3`).all() as { title: string; start_date: string; type: string }[]
if (samples.length > 0) {
  console.log('\n📅 Contoh agenda:')
  samples.forEach(s => {
    console.log(`   • ${s.title} (${s.type}) - ${s.start_date}`)
  })
}

sqlite.close()
console.log('\n✅ Verifikasi selesai! Kalender Akademik siap digunakan.')
