import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { students, attendance } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireAttendanceAccess } from '~~/server/utils/attendanceAccess'

const schema = z.object({
  classId: z.string().min(1, 'Kelas wajib dipilih'),
  subjectId: z.string().min(1, 'Mata pelajaran wajib dipilih'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
  // Status untuk SEMUA siswa. Bila diisi, semua catatan pada (mapel, tanggal) akan di-set ulang.
  status: z.enum(['present', 'late', 'excused', 'sick', 'absent']).optional(),
})

export default defineEventHandler(async (event) => {
  const { classId, subjectId, date, status } = schema.parse(await readBody(event))
  const user = await requireAttendanceAccess(event, classId, subjectId)

  const classStudents = await db.query.students.findMany({ where: eq(students.classId, classId), columns: { id: true } })
  if (!classStudents.length) return { success: true, created: 0, updated: 0 }

  const existing = await db.query.attendance.findMany({
    where: and(eq(attendance.date, date), eq(attendance.classId, classId), eq(attendance.subjectId, subjectId)),
    columns: { studentId: true },
  })
  const existingIds = new Set(existing.map((row) => row.studentId))
  const missing = classStudents.filter((s) => !existingIds.has(s.id))

  let created = 0
  // ponytail: better-sqlite3 tidak mendukung async transaction; batch kecil (≤1 kelas),
  // insert idempoten via unique (student_id, course_id, date) sehingga retry aman.
  for (const student of missing) {
    await db.insert(attendance).values({
      id: crypto.randomUUID(),
      organizationId: user.organizationId,
      studentId: student.id,
      classId,
      subjectId,
      date,
      status: status ?? 'present',
      recordedBy: user.id,
    })
    created++
  }

  let updated = 0
  if (status) {
    await db.update(attendance)
      .set({ status, recordedBy: user.id })
      .where(and(eq(attendance.date, date), eq(attendance.classId, classId), eq(attendance.subjectId, subjectId)))
    updated = classStudents.length
  }

  return { success: true, created, updated }
})