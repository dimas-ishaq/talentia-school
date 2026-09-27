import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { quizAttempts, quizAttemptAnswers, quizQuestions } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireQuizActivity, computeNormalizedScore, recomputeProgress } from '~~/server/utils/quiz'
import { requireCourseManager } from '~~/server/utils/courseAccess'
import { writeAuditLog } from '~~/server/utils/audit'

const schema = z.object({
  answers: z.array(z.object({
    answerId: z.string(),
    pointsEarned: z.number().min(0),
    feedback: z.string().trim().max(5000).optional().default(''),
  })),
})

export default defineEventHandler(async (event) => {
  const courseId = getRouterParam(event, 'id')!
  const quizId = getRouterParam(event, 'quizId')!
  const attemptId = getRouterParam(event, 'attemptId')!
  const { user } = await requireUserSession(event)
  const manager = await requireCourseManager(event, courseId)
  await requireQuizActivity(event, courseId, quizId)
  const body = schema.parse(await readBody(event))
  const attempt = await db.query.quizAttempts.findFirst({ where: and(eq(quizAttempts.id, attemptId), eq(quizAttempts.activityId, quizId)) })
  if (!attempt) throw createError({ statusCode: 404, statusMessage: 'Attempt tidak ditemukan' })

  const attemptAnswers = await db.select({ id: quizAttemptAnswers.id })
    .from(quizAttemptAnswers)
    .where(eq(quizAttemptAnswers.attemptId, attemptId))
  const validAnswerIds = new Set(attemptAnswers.map((a) => a.id))
  const questionRows = await db.select().from(quizQuestions).where(eq(quizQuestions.activityId, quizId))
  const answerRows = await db.select().from(quizAttemptAnswers).where(eq(quizAttemptAnswers.attemptId, attemptId))
  const maxPoints = new Map(answerRows.map((answer) => [answer.id, questionRows.find((q) => q.id === answer.quizQuestionId)?.points ?? 0]))
  for (const a of body.answers) {
    if (!validAnswerIds.has(a.answerId)) throw createError({ statusCode: 400, statusMessage: 'Jawaban bukan milik attempt ini' })
    if (a.pointsEarned > (maxPoints.get(a.answerId) ?? 0)) throw createError({ statusCode: 400, statusMessage: 'Nilai melebihi bobot soal' })
    await db.update(quizAttemptAnswers)
      .set({ pointsEarned: a.pointsEarned, gradedBy: user.id, gradedAt: new Date(), feedback: a.feedback })
      .where(and(eq(quizAttemptAnswers.id, a.answerId), eq(quizAttemptAnswers.attemptId, attemptId)))
  }

  // Essay yang belum diberi nilai tetap needs_grading
  const questions = questionRows
  const answers = await db.select().from(quizAttemptAnswers).where(eq(quizAttemptAnswers.attemptId, attemptId))
  const answerMap = new Map(answers.map((a) => [a.quizQuestionId, a]))
  const ungradedEssay = questions.some((q) => q.type === 'essay' && answerMap.get(q.id)?.pointsEarned == null)

  const score = await computeNormalizedScore(attemptId)
  await db.update(quizAttempts).set({ score, status: ungradedEssay ? 'needs_grading' : 'submitted' }).where(eq(quizAttempts.id, attemptId))
  await recomputeProgress(quizId, attempt.studentId)

  await writeAuditLog({ userId: manager.id, action: 'grade.quiz_update', target: attemptId, metadata: { quizId, answerCount: body.answers.length, score } })
  return { success: true, score, status: ungradedEssay ? 'needs_grading' : 'submitted' }
})
