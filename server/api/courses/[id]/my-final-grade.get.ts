// server/api/courses/[id]/my-final-grade.get.ts
// Siswa melihat nilai akhir dirinya sendiri pada sebuah course.
import { eq, and } from 'drizzle-orm'
import { students, finalGrades } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { findCourseOrThrow } from '~~/server/utils/courseAccess'
import { requireOrganization } from '~~/server/utils/tenant'

export default defineEventHandler(async (event) => {
  const { user, organization } = await requireOrganization(event)
  const courseId = getRouterParam(event, 'id')!
  await findCourseOrThrow(courseId, organization.id)

  if (user.role !== 'student') throw createError({ statusCode: 403, statusMessage: 'Hanya siswa' })

  const student = await db.query.students.findFirst({
    where: and(eq(students.userId, user.id), eq(students.organizationId, organization.id)),
    columns: { id: true },
  })
  if (!student) return { data: null }

  const row = await db.query.finalGrades.findFirst({
    where: and(eq(finalGrades.courseId, courseId), eq(finalGrades.studentId, student.id)),
  })
  // Fase 3: guru harus mempublish nilai akhir sebelum siswa bisa melihatnya.
  if (!row?.publishedAt) return { data: null }

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
