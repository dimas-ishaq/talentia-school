import { and, eq } from 'drizzle-orm'
import { quizAttempts } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireQuizActivity, recomputeProgress } from '~~/server/utils/quiz'
import { requireCourseManager } from '~~/server/utils/courseAccess'

/** Hapus satu percobaan agar siswa dapat memulai ulang quiz. */
export default defineEventHandler(async (event) => {
  const courseId = getRouterParam(event, 'id')!
  const quizId = getRouterParam(event, 'quizId')!
  const attemptId = getRouterParam(event, 'attemptId')!
  await requireCourseManager(event, courseId)
  await requireQuizActivity(event, courseId, quizId)

  const attempt = await db.query.quizAttempts.findFirst({
    where: and(eq(quizAttempts.id, attemptId), eq(quizAttempts.activityId, quizId)),
  })
  if (!attempt) throw createError({ statusCode: 404, statusMessage: 'Percobaan tidak ditemukan' })

  await db.delete(quizAttempts).where(and(eq(quizAttempts.id, attemptId), eq(quizAttempts.activityId, quizId)))
  await recomputeProgress(quizId, attempt.studentId)
  return { success: true, studentId: attempt.studentId }
})
