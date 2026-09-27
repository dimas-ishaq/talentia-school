// server/api/schedules/index.get.ts
// GET /api/schedules — daftar jadwal, dibatasi per role:
// - admin  : semua jadwal (filter dayOfWeek/classId/teacherId opsional)
// - teacher: jadwal mengajar dirinya
// - student: jadwal kelasnya sendiri (hanya aktif)
import { and, asc, eq } from 'drizzle-orm'
import { scheduleEntries, subjects, classes, teachers, users, students } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { DAY_NAMES } from '~~/server/utils/schedule'
import { requireOrganization } from '~~/server/utils/tenant'

const baseSelect = {
  id: scheduleEntries.id,
  dayOfWeek: scheduleEntries.dayOfWeek,
  startTime: scheduleEntries.startTime,
  endTime: scheduleEntries.endTime,
  subjectId: scheduleEntries.subjectId,
  subjectName: subjects.name,
  subjectCode: subjects.code,
  classId: scheduleEntries.classId,
  className: classes.name,
  teacherId: scheduleEntries.teacherId,
  teacherName: users.name,
  room: scheduleEntries.room,
  note: scheduleEntries.note,
  isActive: scheduleEntries.isActive,
}

export default defineEventHandler(async (event) => {
  const { user, organization } = await requireOrganization(event)
  const query = getQuery(event)
  const dayOfWeek = query.dayOfWeek ? Number(query.dayOfWeek) : undefined
  const classId = typeof query.classId === 'string' ? query.classId : undefined

  const dayValid = !dayOfWeek || DAY_NAMES[dayOfWeek as number] !== undefined

  // ----- ADMIN: semua jadwal -----
  if (user.role === 'admin') {
    const teacherId = typeof query.teacherId === 'string' ? query.teacherId : undefined
    const showInactive = typeof query.showInactive === 'string' ? query.showInactive === '1' : true
    const rows = await db
      .select(baseSelect)
      .from(scheduleEntries)
      .leftJoin(subjects, eq(scheduleEntries.subjectId, subjects.id))
      .leftJoin(classes, eq(scheduleEntries.classId, classes.id))
      .leftJoin(teachers, eq(scheduleEntries.teacherId, teachers.id))
      .leftJoin(users, eq(teachers.userId, users.id))
      .where(and(
        eq(scheduleEntries.organizationId, organization.id),
        dayValid && dayOfWeek ? eq(scheduleEntries.dayOfWeek, dayOfWeek as number) : undefined,
        classId ? eq(scheduleEntries.classId, classId) : undefined,
        teacherId ? eq(scheduleEntries.teacherId, teacherId) : undefined,
        showInactive ? undefined : eq(scheduleEntries.isActive, true),
      ))
      .orderBy(asc(scheduleEntries.dayOfWeek), asc(scheduleEntries.startTime))
    return { data: rows, meta: { minDay: 1, maxDay: 6 } }
  }

  // ----- TEACHER: jadwal mengajar dirinya -----
  if (user.role === 'teacher') {
    const teacher = await db.query.teachers.findFirst({ where: eq(teachers.userId, user.id), columns: { id: true } })
    if (!teacher) throw createError({ statusCode: 404, statusMessage: 'Profil guru tidak ditemukan' })
    const rows = await db
      .select(baseSelect)
      .from(scheduleEntries)
      .leftJoin(subjects, eq(scheduleEntries.subjectId, subjects.id))
      .leftJoin(classes, eq(scheduleEntries.classId, classes.id))
      .leftJoin(teachers, eq(scheduleEntries.teacherId, teachers.id))
      .leftJoin(users, eq(teachers.userId, users.id))
      .where(and(
        eq(scheduleEntries.organizationId, organization.id),
        eq(scheduleEntries.teacherId, teacher.id),
        eq(scheduleEntries.isActive, true),
        dayValid && dayOfWeek ? eq(scheduleEntries.dayOfWeek, dayOfWeek as number) : undefined,
        classId ? eq(scheduleEntries.classId, classId) : undefined,
      ))
      .orderBy(asc(scheduleEntries.dayOfWeek), asc(scheduleEntries.startTime))
    return { data: rows, meta: { minDay: 1, maxDay: 6 } }
  }

  // ----- STUDENT: jadwal kelasnya sendiri (selalu hanya aktif) -----
  if (user.role === 'student') {
    const student = await db.query.students.findFirst({ where: eq(students.userId, user.id), columns: { id: true, classId: true } })
    if (!student) throw createError({ statusCode: 404, statusMessage: 'Profil siswa tidak ditemukan' })
    if (!student.classId) return { data: [] }

    const rows = await db
      .select(baseSelect)
      .from(scheduleEntries)
      .leftJoin(subjects, eq(scheduleEntries.subjectId, subjects.id))
      .leftJoin(classes, eq(scheduleEntries.classId, classes.id))
      .leftJoin(teachers, eq(scheduleEntries.teacherId, teachers.id))
      .leftJoin(users, eq(teachers.userId, users.id))
      .where(and(
        eq(scheduleEntries.organizationId, organization.id),
        eq(scheduleEntries.classId, student.classId),
        eq(scheduleEntries.isActive, true),
        dayValid && dayOfWeek ? eq(scheduleEntries.dayOfWeek, dayOfWeek as number) : undefined,
      ))
      .orderBy(asc(scheduleEntries.dayOfWeek), asc(scheduleEntries.startTime))
    return { data: rows }
  }

  throw createError({ statusCode: 403, statusMessage: 'Role tidak didukung' })
})