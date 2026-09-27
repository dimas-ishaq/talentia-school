import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { questionBank, questionOptions, quizQuestions } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireQuizActivity, assertQuizEditable } from '~~/server/utils/quiz'
import { requireCourseManager } from '~~/server/utils/courseAccess'

const schema = z.object({
  questions: z.array(z.object({
    id: z.string().uuid().optional(),
    type: z.enum(['multiple_choice', 'essay']),
    question: z.string().trim().min(1),
    explanation: z.string().nullable().optional(),
    points: z.number().min(0).default(1),
    bankQuestionId: z.string().uuid().nullable().optional(),
    options: z.array(z.object({ id: z.string().optional(), label: z.string(), text: z.string(), isCorrect: z.boolean() })).default([]),
  })),
})

export default defineEventHandler(async (event) => {
  const courseId = getRouterParam(event, 'id')!
  const quizId = getRouterParam(event, 'quizId')!
  await requireCourseManager(event, courseId)
  const activity = await requireQuizActivity(event, courseId, quizId)
  await assertQuizEditable(quizId)
  const body = schema.parse(await readBody(event))

  const current = await db.select({ id: quizQuestions.id }).from(quizQuestions).where(eq(quizQuestions.activityId, quizId))
  const owned = new Set(current.map((r) => r.id))
  const incomingIds = new Set(body.questions.map((q) => q.id).filter(Boolean) as string[])
  // Hapus soal quiz ini yang tidak lagi ada di payload (tetap ter-scope quiz).
  for (const row of current) {
    if (!incomingIds.has(row.id)) {
      await db.delete(quizQuestions).where(and(eq(quizQuestions.id, row.id), eq(quizQuestions.activityId, quizId)))
    }
  }
  for (const [index, q] of body.questions.entries()) {
    let optionsJson: string | null = null
    if (q.type === 'multiple_choice') {
      // Pakai ulang id opsi bila sudah ada, agar jawaban attempt lama tetap cocok.
      const prev = q.id && owned.has(q.id)
        ? (await db.query.quizQuestions.findFirst({ where: and(eq(quizQuestions.id, q.id), eq(quizQuestions.activityId, quizId)) }))?.optionsJson
        : null
      const prevOpts = prev ? (JSON.parse(prev) as { id?: string }[]) : []
      optionsJson = JSON.stringify(q.options.map((o, i) => ({ id: o.id ?? prevOpts[i]?.id ?? crypto.randomUUID(), label: o.label, text: o.text, isCorrect: o.isCorrect })))
    }
    const values = { activityId: quizId, bankQuestionId: q.bankQuestionId ?? null, position: index + 1, type: q.type, question: q.question, explanation: q.explanation ?? null, points: q.points, optionsJson }
    if (q.id && owned.has(q.id)) {
      await db.update(quizQuestions).set(values).where(and(eq(quizQuestions.id, q.id), eq(quizQuestions.activityId, quizId)))
    } else {
      await db.insert(quizQuestions).values({ id: crypto.randomUUID(), ...values })
    }
  }
  return { success: true }
})
