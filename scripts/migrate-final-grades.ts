// scripts/migrate-final-grades.ts
// Buat tabel course_grade_weights & final_grades, dan tambah kolom activity_progress.feedback.
import Database from 'better-sqlite3'

const sqlite = new Database('./server/database/local.db')

// 1. Kolom feedback pada activity_progress
const progressCols = sqlite.prepare("PRAGMA table_info('activity_progress')").all() as { name: string }[]
const existingProgress = new Set(progressCols.map((c) => c.name))
if (!existingProgress.has('feedback')) {
  sqlite.prepare("ALTER TABLE activity_progress ADD COLUMN feedback text").run()
  console.log('✔ activity_progress.feedback added')
} else {
  console.log('— activity_progress.feedback already exists')
}

// 2. Tabel course_grade_weights
sqlite.prepare(`
  CREATE TABLE IF NOT EXISTS course_grade_weights (
    id text PRIMARY KEY NOT NULL,
    course_id text NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    weights_json text NOT NULL,
    is_active integer NOT NULL DEFAULT 1,
    created_by text NOT NULL REFERENCES users(id),
    created_at integer NOT NULL,
    updated_at integer NOT NULL
  )
`).run()
console.log('✔ course_grade_weights ensured')

// 3. Tabel final_grades
sqlite.prepare(`
  CREATE TABLE IF NOT EXISTS final_grades (
    id text PRIMARY KEY NOT NULL,
    course_id text NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    student_id text NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    score real NOT NULL,
    grade text NOT NULL,
    feedback text,
    components_json text,
    calculated_at integer NOT NULL,
    calculated_by text NOT NULL REFERENCES users(id),
    version integer NOT NULL DEFAULT 1
  )
`).run()
console.log('✔ final_grades ensured')

// Index untuk query cepat
sqlite.prepare("CREATE INDEX IF NOT EXISTS final_grades_course_idx ON final_grades(course_id)").run()
sqlite.prepare("CREATE INDEX IF NOT EXISTS final_grades_student_idx ON final_grades(student_id)").run()
sqlite.prepare("CREATE INDEX IF NOT EXISTS cgw_course_idx ON course_grade_weights(course_id)").run()

sqlite.close()
console.log('✅ Migration selesai')
