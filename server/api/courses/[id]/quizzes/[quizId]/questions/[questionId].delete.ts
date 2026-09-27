import { and, eq } from 'drizzle-orm'
import { quizQuestions } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireQuizActivity, assertQuizEditable } from '~~/server/utils/quiz'
import { requireCourseManager } from '~~/server/utils/courseAccess'

export default defineEventHandler(async (event) => {
  const courseId = getRouterParam(event, 'id')!
  const quizId = getRouterParam(event, 'quizId')!
  const questionId = getRouterParam(event, 'questionId')!
  await requireCourseManager(event, courseId)
  await requireQuizActivity(event, courseId, quizId)
  await assertQuizEditable(quizId)
  const [deleted] = await db.delete(quizQuestions).where(and(eq(quizQuestions.id, questionId), eq(quizQuestions.activityId, quizId))).returning({ id: quizQuestions.id })
  if (!deleted) throw createError({ statusCode: 404, statusMessage: 'Soal tidak ditemukan' })
  return { success: true }
})
