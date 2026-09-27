// scripts/migrate-courses-subjects.ts
// Update existing courses with subjectId references
import Database from 'better-sqlite3'

const sqlite = new Database('./server/database/local.db')

sqlite.prepare(`
  UPDATE courses SET subject_id = (SELECT id FROM subjects WHERE code = 'MTK') WHERE id = 'course1'
`).run()
sqlite.prepare(`
  UPDATE courses SET subject_id = (SELECT id FROM subjects WHERE code = 'IPA') WHERE id = 'course2'
`).run()
sqlite.prepare(`
  UPDATE courses SET subject_id = (SELECT id FROM subjects WHERE code = 'BHS-ID') WHERE id = 'course3'
`).run()
sqlite.prepare(`
  UPDATE courses SET subject_id = (SELECT id FROM subjects WHERE code = 'IPS') WHERE id = 'course4'
`).run()

console.log('✅ subject_id updated for 4 courses')
sqlite.close()