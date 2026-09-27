import { and, asc, count, eq, inArray, sql } from 'drizzle-orm'
import { courses, courseTeachers, teachers, questionBank, questionPackages } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)

  let courseIds: string[] | undefined
  if (user.role === 'teacher') {
    const teacher = await db.query.teachers.findFirst({ where: eq(teachers.userId, user.id), columns: { id: true } })
    if (!teacher) return { data: [] }
    const rows = await db.select({ id: courseTeachers.courseId }).from(courseTeachers).where(eq(courseTeachers.teacherId, teacher.id))
    courseIds = rows.map((r) => r.id)
    if (!courseIds.length) return { data: [] }
  }

  const where = courseIds ? and(eq(questionPackages.isActive, true), inArray(questionPackages.courseId, courseIds)) : eq(questionPackages.isActive, true)

  const rows = await db
    .select({
      id: questionPackages.id,
      courseId: questionPackages.courseId,
      name: questionPackages.name,
      description: questionPackages.description,
      createdBy: questionPackages.createdBy,
      isActive: questionPackages.isActive,
      createdAt: questionPackages.createdAt,
      courseName: sql<string>`(select ${courses.name} from ${courses} where ${courses.id} = ${questionPackages.courseId})`.as('course_name'),
      questionCount: count(questionBank.id),
    })
    .from(questionPackages)
    .leftJoin(questionBank, and(eq(questionBank.packageId, questionPackages.id), eq(questionBank.isActive, true)))
    .where(where)
    .groupBy(questionPackages.id)
    .orderBy(asc(questionPackages.courseId), asc(questionPackages.name))

  return { data: rows }
})