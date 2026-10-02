import { and, count, eq, inArray } from 'drizzle-orm'
import { attendance, courseClasses, courseTeachers, courses, students, teachers } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireOrganization } from '~~/server/utils/tenant'

export default defineEventHandler(async (event) => {
  const { user, organization } = await requireOrganization(event)
  if (user.role !== 'teacher') throw createError({ statusCode: 403, statusMessage: 'Akses khusus guru' })

  const teacher = await db.query.teachers.findFirst({ where: and(eq(teachers.userId, user.id), eq(teachers.organizationId, organization.id)), columns: { id: true } })
  if (!teacher) return { totalClasses: 0, totalStudents: 0, pendingGrading: 0, todayAttendance: 0 }

  const coursesTaught = await db
    .select({ courseId: courseTeachers.courseId })
    .from(courseTeachers)
    .innerJoin(courses, and(eq(courseTeachers.courseId, courses.id), eq(courses.organizationId, organization.id)))
    .where(eq(courseTeachers.teacherId, teacher.id))
  const courseIds = coursesTaught.map((row) => row.courseId)
  if (!courseIds.length) return { totalClasses: 0, totalStudents: 0, pendingGrading: 0, todayAttendance: 0 }

  const classRows = await db.select({ classId: courseClasses.classId }).from(courseClasses).where(inArray(courseClasses.courseId, courseIds))
  const classIds = [...new Set(classRows.map((row) => row.classId))]
  if (!classIds.length) return { totalClasses: 0, totalStudents: 0, pendingGrading: 0, todayAttendance: 0 }

  const today = new Date().toISOString().slice(0, 10)
  const countRows = async (q: Promise<{ value: number | string }[]>) => Number((await q)[0]?.value ?? 0)

  const classCount = await countRows(db.select({ value: count() }).from(courseClasses).where(inArray(courseClasses.courseId, courseIds)))
  const studentCount = await countRows(db.select({ value: count() }).from(students).where(inArray(students.classId, classIds)))
  const todayCount = await countRows(db.select({ value: count() }).from(attendance).where(and(inArray(attendance.classId, classIds), eq(attendance.date, today))))

  return {
    totalClasses: classCount,
    totalStudents: studentCount,
    pendingGrading: 0,
    todayAttendance: todayCount,
  }
})
