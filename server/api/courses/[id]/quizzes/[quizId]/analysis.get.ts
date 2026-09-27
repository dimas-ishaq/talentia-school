import { requireQuizActivity } from '~~/server/utils/quiz'
import { requireCourseManager } from '~~/server/utils/courseAccess'
import { computeItemAnalysis } from '~~/server/utils/itemAnalysis'

export default defineEventHandler(async (event) => {
  const courseId = getRouterParam(event, 'id')!
  const quizId = getRouterParam(event, 'quizId')!
  await requireCourseManager(event, courseId)
  const activity = await requireQuizActivity(event, courseId, quizId)
  const query = getQuery(event)
  const classId = typeof query.classId === 'string' && query.classId ? query.classId : null
  const analysis = await computeItemAnalysis(quizId, { classId })
  analysis.quiz = { title: activity.title, maxPoint: activity.maxPoint ?? 100 }
  return { data: analysis }
})
