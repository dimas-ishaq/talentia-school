import { and, eq } from 'drizzle-orm'
import { examEventSubjects, quizQuestions } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireExamManager } from '~~/server/utils/exam'

export default defineEventHandler(async (event) => {
  const eventId = String(getRouterParam(event, 'id') ?? '')
  const subjectId = String(getRouterParam(event, 'subjectId') ?? '')
  const questionId = String(getRouterParam(event, 'questionId') ?? '')
  await requireExamManager(event, eventId)
  const subject = await db.query.examEventSubjects.findFirst({ where: eq(examEventSubjects.id, subjectId) })
  if (!subject || subject.eventId !== eventId) throw createError({ statusCode: 404, statusMessage: 'Mapel tidak ditemukan' })
  await db.delete(quizQuestions).where(and(eq(quizQuestions.id, questionId), eq(quizQuestions.activityId, subject.activityId)))
  return { success: true }
})
