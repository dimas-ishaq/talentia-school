import Database from 'better-sqlite3'

const sqlite = new Database('./server/database/local.db')
const columns = new Set((sqlite.prepare("PRAGMA table_info('attendance')").all() as { name: string }[]).map((c) => c.name))
if (!columns.has('course_id')) sqlite.prepare('ALTER TABLE attendance ADD COLUMN course_id text REFERENCES courses(id)').run()
if (!columns.has('activity_note')) sqlite.prepare('ALTER TABLE attendance ADD COLUMN activity_note text').run()
if (!columns.has('learning_note')) sqlite.prepare('ALTER TABLE attendance ADD COLUMN learning_note text').run()
sqlite.prepare('CREATE UNIQUE INDEX IF NOT EXISTS attendance_student_course_date_idx ON attendance (student_id, course_id, date)').run()
sqlite.close()
console.log('Course logbook migration selesai')
