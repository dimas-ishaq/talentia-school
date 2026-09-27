import { z } from 'zod'
import { questionBank, questionOptions } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { parseAiken, parseCsvQuestions } from '~~/server/utils/quiz'
import { requirePackageManager } from '~~/server/utils/questionPackage'

const schema = z.object({
  format: z.enum(['aiken', 'csv']),
  text: z.string().min(1).max(1000000),
})

export default defineEventHandler(async (event) => {
  const packageId = getRouterParam(event, 'id')!
  await requirePackageManager(event, packageId)
  const { user } = await requireUserSession(event)
  const body = schema.parse(await readBody(event))
  const parsed = body.format === 'aiken' ? parseAiken(body.text) : parseCsvQuestions(body.text)
  if (!parsed.length) throw createError({ statusCode: 400, statusMessage: 'Format soal tidak valid atau tidak ada soal' })

  const created: string[] = []
  for (const item of parsed) {
    const id = crypto.randomUUID()
    await db.insert(questionBank).values({
      id,
      packageId,
      scope: 'course',
      categoryId: null,
      courseId: null,
      quizActivityId: null,
      createdBy: user.id,
      type: item.type === 'essay' ? 'essay' : 'multiple_choice',
      question: item.question,
      defaultPoints: ('points' in item ? item.points : undefined) ?? 1,
    })
    if (item.options?.length) await db.insert(questionOptions).values(item.options.map((o) => ({ id: crypto.randomUUID(), questionId: id, ...o })))
    created.push(id)
  }
  return { success: true, count: created.length, ids: created }
})