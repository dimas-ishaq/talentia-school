// GET /api/parent/dashboard — ringkasan anak yang terhubung ke akun orang tua.
import { and, eq, sql } from 'drizzle-orm'
import { attendance, classes, courses, finalGrades, parents, students, users } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireOrganization } from '~~/server/utils/tenant'

export default defineEventHandler(async (event) => {
  const { user, organization } = await requireOrganization(event)
  if (user.role !== 'parent') throw createError({ statusCode: 403, statusMessage: 'Hanya orang tua' })

  const parent = await db.query.parents.findFirst({
    where: and(eq(parents.userId, user.id), eq(parents.organizationId, organization.id)),
    columns: { id: true },
  })
  if (!parent) return { data: [], message: 'Data anak belum terhubung.' }

  const children = await db
    .select({ id: students.id, name: users.name, nis: students.nis, classId: students.classId, className: classes.name })
    .from(students)
    .innerJoin(users, eq(users.id, students.userId))
    .leftJoin(classes, eq(classes.id, students.classId))
    .where(and(eq(students.parentId, parent.id), eq(students.organizationId, organization.id)))

  const data = await Promise.all(children.map(async (child) => {
    const attendanceRows = await db
      .select({ status: attendance.status, total: sql<number>`count(*)` })
      .from(attendance)
      .where(and(eq(attendance.studentId, child.id), eq(attendance.organizationId, organization.id)))
      .groupBy(attendance.status)
    const grades = await db
      .select({ courseId: finalGrades.courseId, courseName: courses.name, score: finalGrades.score, grade: finalGrades.grade, feedback: finalGrades.feedback, publishedAt: finalGrades.publishedAt })
      .from(finalGrades)
      .innerJoin(courses, and(eq(courses.id, finalGrades.courseId), eq(courses.organizationId, organization.id)))
      .where(and(eq(finalGrades.studentId, child.id), sql`${finalGrades.publishedAt} is not null`))
    return { ...child, attendance: attendanceRows, grades }
  }))

  return { data }
})
