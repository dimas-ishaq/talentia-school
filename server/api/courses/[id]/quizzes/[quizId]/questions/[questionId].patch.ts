import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { quizQuestions } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireQuizActivity, assertQuizEditable } from '~~/server/utils/quiz'
import { requireCourseManager } from '~~/server/utils/courseAccess'
import { regradeQuiz } from '~~/server/utils/itemAnalysis'

const schema = z.object({
  points: z.number().min(0).max(1000).optional(),
  position: z.number().int().min(1).optional(),
  question: z.string().trim().min(1).max(10000).optional(),
  explanation: z.string().trim().max(5000).nullable().optional(),
  options: z.array(z.object({ id: z.string().optional(), label: z.string(), text: z.string(), isCorrect: z.boolean() })).optional(),
  targetClassIds: z.array(z.string().uuid()).nullable().optional(),
})

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

  // points/options boleh diubah walau sudah ada submission (picu regrade).
  // Field lain tetap terkunci.
  if (body.question !== undefined || body.explanation !== undefined || body.position !== undefined || body.targetClassIds !== undefined) {
    await assertQuizEditable(quizId)
  }

  const values: Record<string, any> = {}
  if (body.points !== undefined) values.points = body.points
  if (body.position !== undefined) values.position = body.position
  if (body.question !== undefined) values.question = body.question
  if (body.explanation !== undefined) values.explanation = body.explanation
  if (body.targetClassIds !== undefined) values.targetClassIds = body.targetClassIds?.length ? JSON.stringify(body.targetClassIds) : null

  let answerKeyChanged = false
  if (body.options !== undefined) {
    const prev = existing.optionsJson ? (JSON.parse(existing.optionsJson) as { id?: string; label: string; text?: string; isCorrect?: boolean }[]) : []
    const nextOptions = body.options.map((o, i) => ({
      id: o.id ?? prev[i]?.id ?? crypto.randomUUID(),
      label: o.label,
      text: o.text,
      isCorrect: o.isCorrect,
    }))
    if (existing.type === 'multiple_choice') {
      answerKeyChanged = JSON.stringify(prev.map((o) => o.isCorrect)) !== JSON.stringify(nextOptions.map((o) => o.isCorrect)) ||
        JSON.stringify(prev.map((o) => o.text)) !== JSON.stringify(nextOptions.map((o) => o.text)) ||
        JSON.stringify(prev.map((o) => o.id)) !== JSON.stringify(nextOptions.map((o) => o.id))
    }
    values.optionsJson = JSON.stringify(nextOptions)
  }

  if (Object.keys(values).length) {
    await db.update(quizQuestions).set(values).where(and(eq(quizQuestions.id, questionId), eq(quizQuestions.activityId, quizId)))
  }

  if (answerKeyChanged) {
    await regradeQuiz(quizId)
  }
  return { success: true, answerKeyChanged }
})
