import { and, asc, desc, eq, gte, lte } from 'drizzle-orm'
import { attendance, classes, students, users } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { findCourseOrThrow, isCourseManager } from '~~/server/utils/courseAccess'
import { requireOrganization } from '~~/server/utils/tenant'

export default defineEventHandler(async (event) => {
  const { user, organization } = await requireOrganization(event)
  const courseId = getRouterParam(event, 'id')!
  const course = await findCourseOrThrow(courseId, organization.id)
  const query = getQuery(event)
  const filterStudentId = typeof query.studentId === 'string' && query.studentId ? query.studentId : undefined
  const from = typeof query.from === 'string' && query.from ? query.from : undefined
  const to = typeof query.to === 'string' && query.to ? query.to : undefined

  let scopedStudentId: string | undefined
  if (user.role === 'student') {
    const student = await db.query.students.findFirst({ where: eq(students.userId, user.id), columns: { id: true } })
    if (!student) throw createError({ statusCode: 403, statusMessage: 'Profil siswa tidak ditemukan' })
    scopedStudentId = student.id
  } else if (user.role === 'teacher' && !(await isCourseManager(user.id, courseId))) {
    throw createError({ statusCode: 403, statusMessage: 'Anda tidak mengampu course ini' })
  } else if (!['admin', 'org_admin', 'owner', 'teacher'].includes(user.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Role tidak didukung' })
  }

  const filters = [eq(attendance.courseId, course.id)]
  if (scopedStudentId) filters.push(eq(attendance.studentId, scopedStudentId))
  else if (filterStudentId) filters.push(eq(attendance.studentId, filterStudentId))
  if (from) filters.push(gte(attendance.date, from))
  if (to) filters.push(lte(attendance.date, to))

  const rows = await db
    .select({
      id: attendance.id,
      date: attendance.date,
      status: attendance.status,
      note: attendance.note,
      activityNote: attendance.activityNote,
      learningNote: attendance.learningNote,
      studentId: attendance.studentId,
      studentName: users.name,
      nis: students.nis,
      className: classes.name,
    })
    .from(attendance)
    .leftJoin(students, eq(attendance.studentId, students.id))
    .leftJoin(users, eq(students.userId, users.id))
    .leftJoin(classes, eq(attendance.classId, classes.id))
    .where(and(...filters))
    .orderBy(desc(attendance.date), asc(users.name))

  const summary: Record<string, number> = { present: 0, late: 0, excused: 0, sick: 0, absent: 0, total: rows.length }
  for (const row of rows) if (row.status in summary) summary[row.status]! += 1

  return { data: rows, summary, canManage: ['admin', 'org_admin', 'owner'].includes(user.role) || (user.role === 'teacher' && (await isCourseManager(user.id, courseId))) }
})
