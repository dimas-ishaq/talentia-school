import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { questionBank, questionOptions, courses } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { parseAiken, parseCsvQuestions } from '~~/server/utils/quiz'
import { requireOrganization } from '~~/server/utils/tenant'

const schema = z.object({
  format: z.enum(['aiken', 'csv']),
  text: z.string().min(1).max(1000000),
  scope: z.enum(['global', 'category', 'course', 'quiz']).default('global'),
  categoryId: z.string().nullable().optional(),
  courseId: z.string().nullable().optional(),
  quizActivityId: z.string().nullable().optional(),
})

export default defineEventHandler(async (event) => {
  // ponytail: question_bank tanpa kolom organization_id. Tenant via creator membership.
  const { user, organization } = await requireOrganization(event)
  if (!['admin', 'teacher'].includes(user.role)) throw createError({ statusCode: 403, statusMessage: 'Hanya guru atau admin' })
  const body = schema.parse(await readBody(event))
  if (body.courseId) {
    const course = await db.query.courses.findFirst({ where: and(eq(courses.id, body.courseId), eq(courses.organizationId, organization.id)), columns: { id: true } })
    if (!course) throw createError({ statusCode: 404, statusMessage: 'Course tidak ditemukan' })
  }
  const parsed = body.format === 'aiken' ? parseAiken(body.text) : parseCsvQuestions(body.text)
  if (!parsed.length) throw createError({ statusCode: 400, statusMessage: 'Format soal tidak valid atau tidak ada soal' })

  const created: string[] = []
  for (const item of parsed) {
    const id = crypto.randomUUID()
    await db.insert(questionBank).values({
      id,
      scope: body.scope,
      categoryId: body.categoryId || null,
      courseId: body.courseId || null,
      quizActivityId: body.quizActivityId || null,
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
