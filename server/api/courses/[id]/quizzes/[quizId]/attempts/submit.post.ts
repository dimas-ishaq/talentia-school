import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { quizAttempts, quizQuestions, quizAttemptAnswers } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireQuizActivity, requireEnrolledStudent, finalizeAttempt, canStudentSeeScore } from '~~/server/utils/quiz'
import { enforceQuizRateLimit } from '~~/server/utils/quizSecurity'

const schema = z.object({
  attemptId: z.string().uuid(),
  answers: z.array(z.object({
    questionId: z.string(),
    selectedOptionId: z.string().nullable().optional(),
    answerText: z.string().max(5000).nullable().optional(),
  })),
})

export default defineEventHandler(async (event) => {
  const courseId = getRouterParam(event, 'id')!
  const quizId = getRouterParam(event, 'quizId')!
  const { user } = await requireUserSession(event)
  if (user.role !== 'student') throw createError({ statusCode: 403, statusMessage: 'Hanya siswa' })
  const activity = await requireQuizActivity(event, courseId, quizId)
  const student = await requireEnrolledStudent(user.id, courseId)
  enforceQuizRateLimit(`quiz-submit:${student.id}`, 30, 60_000)
  const body = schema.parse(await readBody(event))

  const attempt = await db.query.quizAttempts.findFirst({
    where: and(eq(quizAttempts.id, body.attemptId), eq(quizAttempts.activityId, quizId), eq(quizAttempts.studentId, student.id)),
  })
  if (!attempt || attempt.status !== 'in_progress') throw createError({ statusCode: 400, statusMessage: 'Percobaan tidak valid atau sudah selesai' })

  // Cek kedaluwarsa server-side → auto submit
  let auto = false
  if (activity.durationMinutes && activity.durationMinutes > 0) {
    const elapsed = Date.now() - attempt.startedAt.getTime()
    if (elapsed > activity.durationMinutes * 60000) auto = true
  }

  const questions = await db.select().from(quizQuestions).where(eq(quizQuestions.activityId, quizId))
  const qMap = new Map(questions.map((q) => [q.id, q]))

  for (const ans of body.answers) {
    const q = qMap.get(ans.questionId)
    if (!q) continue
    const existing = await db.query.quizAttemptAnswers.findFirst({
      where: and(eq(quizAttemptAnswers.attemptId, attempt.id), eq(quizAttemptAnswers.quizQuestionId, ans.questionId)),
    })
    const data = {
      quizQuestionId: ans.questionId,
      selectedOptionId: ans.selectedOptionId ?? null,
      answerText: ans.answerText ?? null,
    }
    if (existing) {
      await db.update(quizAttemptAnswers).set(data).where(eq(quizAttemptAnswers.id, existing.id))
    } else {
      await db.insert(quizAttemptAnswers).values({ id: crypto.randomUUID(), attemptId: attempt.id, ...data })
    }
  }

  const result = await finalizeAttempt(attempt.id, { auto })
  const showScore = canStudentSeeScore(activity as any)
  return {
    success: true,
    score: showScore ? result.score : null,
    showScore,
    scoreVisibility: (activity as any).scoreVisibility ?? 'immediate',
    status: result.status,
  }
})
