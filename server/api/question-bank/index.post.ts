import { z } from 'zod'
import { questionBank, questionOptions } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

const optionSchema = z.object({
  label: z.string().trim().min(1).max(4),
  text: z.string().trim().max(2000),
  isCorrect: z.boolean().optional().default(false),
})

const schema = z.object({
  scope: z.enum(['global', 'category', 'course', 'quiz']).default('global'),
  categoryId: z.string().trim().nullable().optional(),
  courseId: z.string().trim().nullable().optional(),
  quizActivityId: z.string().trim().nullable().optional(),
  type: z.enum(['multiple_choice', 'essay']),
  question: z.string().trim().min(1, 'Pertanyaan wajib diisi').max(10000),
  explanation: z.string().trim().max(5000).optional().default(''),
  defaultPoints: z.number().min(0).max(1000).optional().default(1),
  options: z.array(optionSchema).optional().default([]),
})

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  if (!['admin', 'teacher'].includes(user.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Hanya guru atau admin' })
  }

  const body = schema.parse(await readBody(event))
  if (body.type === 'multiple_choice') {
    if (body.options.length < 2) throw createError({ statusCode: 400, statusMessage: 'Minimal 2 pilihan jawaban' })
    if (!body.options.some((o) => o.isCorrect)) throw createError({ statusCode: 400, statusMessage: 'Tentukan jawaban benar' })
  }

  const id = crypto.randomUUID()
  await db.insert(questionBank).values({
    id,
    scope: body.scope,
    categoryId: body.categoryId || null,
    courseId: body.courseId || null,
    quizActivityId: body.quizActivityId || null,
    createdBy: user.id,
    type: body.type,
    question: body.question,
    explanation: body.explanation || null,
    defaultPoints: body.defaultPoints,
  })

  if (body.type === 'multiple_choice' && body.options.length) {
    await db.insert(questionOptions).values(body.options.map((o) => ({
      id: crypto.randomUUID(),
      questionId: id,
      label: o.label,
      text: o.text,
      isCorrect: o.isCorrect,
    })))
  }

  return { success: true, data: { id } }
})
