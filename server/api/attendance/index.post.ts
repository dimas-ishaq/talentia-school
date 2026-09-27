import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { attendance, students, subjects } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireAttendanceAccess } from '~~/server/utils/attendanceAccess'
import { writeAuditLog } from '~~/server/utils/audit'
import { requireOrganization } from '~~/server/utils/tenant'

const schema = z.object({
  studentId: z.string().min(1),
  subjectId: z.string().min(1, 'Mata pelajaran wajib dipilih'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
  status: z.enum(['present', 'late', 'excused', 'sick', 'absent']),
  note: z.string().max(500).optional().default(''),
})

export default defineEventHandler(async (event) => {
  const { organization, user: sessionUser } = await requireOrganization(event)
  const body = schema.parse(await readBody(event))
  const student = await db.query.students.findFirst({ where: and(eq(students.id, body.studentId), eq(students.organizationId, organization.id)), columns: { id: true, classId: true, userId: true } })
  if (sessionUser.role === 'student' && student?.userId !== sessionUser.id) throw createError({ statusCode: 403, statusMessage: 'Siswa hanya dapat mengisi absensinya sendiri' })
  if (sessionUser.role === 'student' && body.status !== 'present') throw createError({ statusCode: 403, statusMessage: 'Absensi mandiri hanya dapat mencatat status Hadir' })
  if (sessionUser.role === 'student' && body.date !== new Date().toISOString().slice(0, 10)) throw createError({ statusCode: 403, statusMessage: 'Absensi mandiri hanya dapat diisi hari ini' })
  const subject = await db.query.subjects.findFirst({ where: and(eq(subjects.id, body.subjectId), eq(subjects.organizationId, organization.id)), columns: { id: true } })
  if (!subject) throw createError({ statusCode: 404, statusMessage: 'Mata pelajaran tidak ditemukan' })
  if (!student?.classId) throw createError({ statusCode: 400, statusMessage: 'Siswa tidak memiliki kelas' })

  // Admin: semua kelas/mapel. Guru: hanya (kelas, mapel) yang diampu.
  const user = await requireAttendanceAccess(event, student.classId, body.subjectId)

  // Upsert: menandai ulang absensi (siswa + mapel + tanggal) akan memperbarui, bukan error.
  const [saved] = await db
    .insert(attendance)
    .values({
      id: crypto.randomUUID(),
      organizationId: organization.id,
      studentId: student.id,
      classId: student.classId,
      subjectId: body.subjectId,
      date: body.date,
      status: body.status,
      note: body.note.trim() || null,
      recordedBy: user.id,
    })
    .onConflictDoUpdate({
      target: [attendance.studentId, attendance.subjectId, attendance.date],
      set: { status: body.status, note: body.note.trim() || null, recordedBy: user.id, classId: student.classId },
    })
    .returning()

  await writeAuditLog({ userId: user.id, action: 'attendance.upsert', target: saved?.id, metadata: { studentId: body.studentId, subjectId: body.subjectId, date: body.date, status: body.status } })
  return { success: true, data: saved }
})
