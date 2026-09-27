import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { quizQuestions } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireQuizActivity } from '~~/server/utils/quiz'
import { requireCourseManager } from '~~/server/utils/courseAccess'
import { regradeQuiz } from '~~/server/utils/itemAnalysis'

const schema = z.object({
  optionId: z.string().min(1),
})

/** Ubah kunci jawaban soal PG, lalu nilai ulang seluruh attempt.
 *  Satu-satunya jalur edit soal yang tetap boleh saat quiz sudah punya submission. */
export default defineEventHandler(async (event) => {
  const courseId = getRouterParam(event, 'id')!
  const quizId = getRouterParam(event, 'quizId')!
  const questionId = getRouterParam(event, 'questionId')!
  await requireCourseManager(event, courseId)
  await requireQuizActivity(event, courseId, quizId)
  const body = schema.parse(await readBody(event))

  const existing = await db.query.quizQuestions.findFirst({
    where: and(eq(quizQuestions.id, questionId), eq(quizQuestions.activityId, quizId)),
  })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Soal tidak ditemukan di quiz ini' })
  if (existing.type !== 'multiple_choice') throw createError({ statusCode: 400, statusMessage: 'Essay tidak punya kunci otomatis' })
  const prev = existing.optionsJson ? (JSON.parse(existing.optionsJson) as { id: string; label: string; text: string; isCorrect: boolean }[]) : []
  if (!prev.some((o) => o.id === body.optionId)) throw createError({ statusCode: 400, statusMessage: 'Opsi tidak ditemukan' })

  const next = prev.map((o) => ({ ...o, isCorrect: o.id === body.optionId }))
  await db.update(quizQuestions).set({ optionsJson: JSON.stringify(next) }).where(eq(quizQuestions.id, questionId))

  const regraded = await regradeQuiz(quizId)
  return { success: true, regradedAttempts: regraded }
})