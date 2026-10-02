// POST /api/student/exam-attempts/[attemptId]/answers — autosave tanpa mengakhiri ujian.
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { examSessions, quizAttemptAnswers, quizAttempts, quizQuestions, students } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireOrganization } from '~~/server/utils/tenant'

const schema = z.object({
  questionId: z.string(),
  selectedOptionId: z.string().nullable().optional(),
  answerText: z.string().max(5000).nullable().optional(),
})

export default defineEventHandler(async (event) => {
  const attemptId = String(getRouterParam(event, 'attemptId') ?? '')
  const { user, organization } = await requireOrganization(event)
  if (user.role !== 'student') throw createError({ statusCode: 403, statusMessage: 'Hanya siswa' })
  const body = schema.parse(await readBody(event))
  const student = await db.query.students.findFirst({ where: and(eq(students.userId, user.id), eq(students.organizationId, organization.id)), columns: { id: true } })
  const attempt = await db.query.quizAttempts.findFirst({ where: and(eq(quizAttempts.id, attemptId), eq(quizAttempts.studentId, student?.id ?? '')) })
  if (!student || !attempt || attempt.status !== 'in_progress') throw createError({ statusCode: 400, statusMessage: 'Percobaan tidak aktif' })
  if (attempt.lockStatus === 'locked') throw createError({ statusCode: 403, statusMessage: 'Ujian terkunci, hubungi pengawas' })
  const session = attempt.sessionId ? await db.query.examSessions.findFirst({ where: eq(examSessions.id, attempt.sessionId), columns: { durationMinutes: true } }) : null
  const durationMinutes = session?.durationMinutes ?? 90
  if (Date.now() > attempt.startedAt.getTime() + durationMinutes * 60_000) throw createError({ statusCode: 409, statusMessage: 'Waktu ujian sudah habis' })
  const question = await db.query.quizQuestions.findFirst({ where: and(eq(quizQuestions.id, body.questionId), eq(quizQuestions.activityId, attempt.activityId)), columns: { id: true } })
  if (!question) throw createError({ statusCode: 400, statusMessage: 'Soal tidak valid' })
  const existing = await db.query.quizAttemptAnswers.findFirst({ where: and(eq(quizAttemptAnswers.attemptId, attemptId), eq(quizAttemptAnswers.quizQuestionId, body.questionId)), columns: { id: true } })
  const values = { selectedOptionId: body.selectedOptionId ?? null, answerText: body.answerText ?? null }
  if (existing) await db.update(quizAttemptAnswers).set(values).where(eq(quizAttemptAnswers.id, existing.id))
  else await db.insert(quizAttemptAnswers).values({ id: crypto.randomUUID(), attemptId, quizQuestionId: body.questionId, ...values })
  return { success: true }
})
