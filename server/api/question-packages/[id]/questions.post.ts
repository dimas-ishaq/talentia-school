import { z } from 'zod'
import { questionBank, questionPackages, questionOptions } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requirePackageManager } from '~~/server/utils/questionPackage'

const optionSchema = z.object({
  label: z.string().trim().min(1).max(4),
  text: z.string().trim().max(2000),
  isCorrect: z.boolean().optional().default(false),
})

const schema = z.object({
  type: z.enum(['multiple_choice', 'essay']),
  question: z.string().trim().min(1, 'Pertanyaan wajib diisi').max(10000),
  explanation: z.string().trim().max(5000).optional().default(''),
  defaultPoints: z.number().min(0).max(1000).optional().default(1),
  options: z.array(optionSchema).optional().default([]),
})

export default defineEventHandler(async (event) => {
  const packageId = getRouterParam(event, 'id')!
  await requirePackageManager(event, packageId)
  const { user } = await requireUserSession(event)
  const body = schema.parse(await readBody(event))

  if (body.type === 'multiple_choice') {
    if (body.options.length < 2) throw createError({ statusCode: 400, statusMessage: 'Minimal 2 pilihan jawaban' })
    if (!body.options.some((o) => o.isCorrect)) throw createError({ statusCode: 400, statusMessage: 'Tentukan jawaban benar' })
  }

  const id = crypto.randomUUID()
  await db.insert(questionBank).values({
    id,
    packageId,
    scope: 'course',
    categoryId: null,
    courseId: null,
    quizActivityId: null,
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