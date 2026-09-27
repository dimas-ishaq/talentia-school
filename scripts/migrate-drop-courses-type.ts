// scripts/migrate-drop-courses-type.ts
// Migrasi: hapus konsep "course bertipe exam".
//
// Perubahan:
//  1. Hapus semua course dengan type = 'exam' (ujian kini dikelola lewat Exam Events).
//  2. Tambah kolom is_system pada courses (menandai container internal exam-event,
//     agar tersembunyi dari daftar course).
//  3. Drop kolom type dari tabel courses.
//
// Jalankan: npm run db:migrate:drop-course-type

import { execSync } from 'node:child_process';
import { copyFileSync } from 'node:fs';
import Database from 'better-sqlite3';

const DB_PATH = './server/database/local.db';

function log(msg: string) {
  console.log(`\x1b[36m▸\x1b[0m ${msg}`);
}
function success(msg: string) {
  console.log(`\x1b[32m✓\x1b[0m ${msg}`);
}
function error(msg: string) {
  console.log(`\x1b[31m✗\x1b[0m ${msg}`);
}

async function main() {
  console.log('\n\x1b[1m🔄 Migrasi: Drop Field Type dari Courses\x1b[0m\n');

  // 1. Backup database
  const backupPath = `${DB_PATH}.backup.${new Date().toISOString().replace(/[:.]/g, '-')}`;
  log('Membuat backup database...');
  try {
    copyFileSync(DB_PATH, backupPath);
    success(`Backup dibuat: ${backupPath}`);
  } catch {
    error('Gagal membuat backup — migrasi dibatalkan');
    process.exit(1);
  }

  // 2. Bersihkan data sebelum schema diubah
  log('Memeriksa data course...');
  const db = new Database(DB_PATH);
  const columns = db.prepare('PRAGMA table_info(courses)').all() as { name: string }[];
  const hasType = columns.some((c) => c.name === 'type');

  if (hasType) {
    const examCourses = db
      .prepare("SELECT id, name FROM courses WHERE type = 'exam'")
      .all() as { id: string; name: string }[];
    if (examCourses.length) {
      log(`Menghapus ${examCourses.length} course bertipe "exam"...`);
      for (const c of examCourses) console.log(`    - ${c.name} (${c.id})`);
      db.exec("DELETE FROM courses WHERE type = 'exam'");
      success('Course bertipe "exam" dihapus');
    } else {
      log('Tidak ada course bertipe "exam".');
    }
  } else {
    log('Kolom type sudah tidak ada.');
  }
  db.close();

  // 3. Terapkan perubahan schema via drizzle-kit push (tambah is_system, drop type)
  log('Menerapkan perubahan schema via drizzle-kit push...');
  try {
    execSync('npx drizzle-kit push --force', { stdio: 'inherit' });
    success('Schema berhasil diperbarui');
  } catch {
    error('Gagal push schema — database bisa di-restore dari backup');
    process.exit(1);
  }

  success('Migrasi selesai!');
  console.log('\nRingkasan:');
  console.log('  - Course bertipe "exam" dihapus');
  console.log('  - Kolom "type" di-drop dari tabel courses');
  console.log('  - Kolom "is_system" ditambahkan (container internal ujian)');
  console.log('  - Ujian dikelola lewat Exam Events (ASTS/ASAS/PAS/PAT)\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
