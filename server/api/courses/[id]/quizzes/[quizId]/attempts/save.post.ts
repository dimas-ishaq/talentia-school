import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { quizAttempts, quizQuestions, quizAttemptAnswers } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireQuizActivity, requireEnrolledStudent, finalizeAttempt } from '~~/server/utils/quiz'
import { enforceQuizRateLimit } from '~~/server/utils/quizSecurity'

// Autosave: simpan jawaban tanpa men-submit attempt
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
  const { user, organization } = await requireOrganization(event)
  if (user.role !== 'student') throw createError({ statusCode: 403, statusMessage: 'Hanya siswa' })
  const activity = await requireQuizActivity(event, courseId, quizId)
  const student = await requireEnrolledStudent(user.id, courseId)
  enforceQuizRateLimit(`quiz-save:${student.id}`, 120, 60_000)
  const body = schema.parse(await readBody(event))

  const attempt = await db.query.quizAttempts.findFirst({
    where: and(eq(quizAttempts.id, body.attemptId), eq(quizAttempts.activityId, quizId), eq(quizAttempts.studentId, student.id)),
  })
  if (!attempt || attempt.status !== 'in_progress') throw createError({ statusCode: 400, statusMessage: 'Percobaan tidak valid' })

  // Jika masa kerja habis, kunci attempt saat ini; jangan terima jawaban baru.
  if (activity.durationMinutes && activity.durationMinutes > 0) {
    const elapsed = Date.now() - attempt.startedAt.getTime()
    if (elapsed > activity.durationMinutes * 60000) {
      await finalizeAttempt(attempt.id, { auto: true })
      throw createError({ statusCode: 400, statusMessage: 'Waktu telah habis, jawaban dikirim otomatis' })
    }
  }

  const questions = await db.select().from(quizQuestions).where(eq(quizQuestions.activityId, quizId))
  const qMap = new Map(questions.map((q) => [q.id, q]))

  for (const ans of body.answers) {
    if (!qMap.has(ans.questionId)) continue
    const existing = await db.query.quizAttemptAnswers.findFirst({
      where: and(eq(quizAttemptAnswers.attemptId, attempt.id), eq(quizAttemptAnswers.quizQuestionId, ans.questionId)),
    })
    const data = { selectedOptionId: ans.selectedOptionId ?? null, answerText: ans.answerText ?? null }
    if (existing) {
      await db.update(quizAttemptAnswers).set(data).where(eq(quizAttemptAnswers.id, existing.id))
    } else {
      await db.insert(quizAttemptAnswers).values({ id: crypto.randomUUID(), attemptId: attempt.id, quizQuestionId: ans.questionId, ...data })
    }
  }
  return { success: true }
})
