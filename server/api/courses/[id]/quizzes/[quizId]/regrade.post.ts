import { requireQuizActivity } from '~~/server/utils/quiz'
import { requireCourseManager } from '~~/server/utils/courseAccess'
import { regradeQuiz } from '~~/server/utils/itemAnalysis'

/** Nilai ulang seluruh submission berdasarkan kunci jawaban quiz saat ini. */
export default defineEventHandler(async (event) => {
  const courseId = getRouterParam(event, 'id')!
  const quizId = getRouterParam(event, 'quizId')!
  await requireCourseManager(event, courseId)
  await requireQuizActivity(event, courseId, quizId)

  const count = await regradeQuiz(quizId)
  return { success: true, regradedAttempts: count }
})
