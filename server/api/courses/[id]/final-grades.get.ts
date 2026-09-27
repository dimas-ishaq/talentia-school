// server/api/courses/[id]/final-grades.get.ts
// Ambil snapshot nilai akhir siswa untuk sebuah course.
import { eq, desc } from 'drizzle-orm'
import { students, users, classes, finalGrades } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireCourseManager } from '~~/server/utils/courseAccess'

export default defineEventHandler(async (event) => {
  const courseId = getRouterParam(event, 'id')!
  await requireCourseManager(event, courseId)

  const rows = await db
    .select({
      id: finalGrades.id,
      studentId: finalGrades.studentId,
      studentName: users.name,
      nis: students.nis,
      className: classes.name,
      score: finalGrades.score,
      grade: finalGrades.grade,
      feedback: finalGrades.feedback,
      componentsJson: finalGrades.componentsJson,
      calculatedAt: finalGrades.calculatedAt,
      version: finalGrades.version,
    })
    .from(finalGrades)
    .innerJoin(students, eq(finalGrades.studentId, students.id))
    .innerJoin(users, eq(students.userId, users.id))
    .leftJoin(classes, eq(students.classId, classes.id))
    .where(eq(finalGrades.courseId, courseId))
    .orderBy(desc(finalGrades.version), desc(finalGrades.calculatedAt))

  return { data: rows }
})
