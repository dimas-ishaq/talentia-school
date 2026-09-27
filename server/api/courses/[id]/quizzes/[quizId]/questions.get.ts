import { asc, eq } from 'drizzle-orm'
import { quizQuestions } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireQuizActivity } from '~~/server/utils/quiz'
import { requireCourseManager } from '~~/server/utils/courseAccess'

export default defineEventHandler(async (event) => {
  const courseId = getRouterParam(event, 'id')!
  const quizId = getRouterParam(event, 'quizId')!
  await requireCourseManager(event, courseId)
  await requireQuizActivity(event, courseId, quizId)

  const rows = await db.select().from(quizQuestions).where(eq(quizQuestions.activityId, quizId)).orderBy(asc(quizQuestions.position))
  return {
    data: rows.map((q) => ({
      ...q,
      options: q.optionsJson ? JSON.parse(q.optionsJson) : [],
    })),
  }
})
