import { and, desc, eq } from 'drizzle-orm'
import { quizEvents, quizAttempts, students, users } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireQuizActivity } from '~~/server/utils/quiz'
import { requireCourseManager } from '~~/server/utils/courseAccess'

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

  const rows = await db
    .select({
      id: quizEvents.id,
      type: quizEvents.type,
      detail: quizEvents.detail,
      createdAt: quizEvents.createdAt,
      studentName: users.name,
    })
    .from(quizEvents)
    .leftJoin(students, eq(quizEvents.studentId, students.id))
    .leftJoin(users, eq(students.userId, users.id))
    .where(eq(quizEvents.attemptId, attemptId))
    .orderBy(desc(quizEvents.createdAt))

  return { data: rows }
})
