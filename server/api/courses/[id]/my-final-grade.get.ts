// server/api/courses/[id]/my-final-grade.get.ts
// Siswa melihat nilai akhir dirinya sendiri pada sebuah course.
import { eq, and } from 'drizzle-orm'
import { students, finalGrades } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { findCourseOrThrow } from '~~/server/utils/courseAccess'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const courseId = getRouterParam(event, 'id')!
  await findCourseOrThrow(courseId)

  if (user.role !== 'student') throw createError({ statusCode: 403, statusMessage: 'Hanya siswa' })

  const student = await db.query.students.findFirst({
    where: eq(students.userId, user.id),
    columns: { id: true },
  })
  if (!student) return { data: null }

  const row = await db.query.finalGrades.findFirst({
    where: and(eq(finalGrades.courseId, courseId), eq(finalGrades.studentId, student.id)),
  })
  if (!row) return { data: null }

  return {
    data: {
      score: row.score,
      grade: row.grade,
      feedback: row.feedback,
      componentsJson: row.componentsJson,
      calculatedAt: row.calculatedAt,
    },
  }
})
