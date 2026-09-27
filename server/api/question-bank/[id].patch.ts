import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { questionBank, questionOptions } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

const schema = z.object({
  scope: z.enum(['global', 'category', 'course', 'quiz']).optional(),
  question: z.string().trim().min(1).max(10000).optional(),
  explanation: z.string().trim().max(5000).nullable().optional(),
  defaultPoints: z.number().min(0).max(1000).optional(),
  isActive: z.boolean().optional(),
})

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  if (!['admin', 'teacher'].includes(user.role)) throw createError({ statusCode: 403, statusMessage: 'Hanya guru atau admin' })
  const id = getRouterParam(event, 'id')!
  const body = schema.parse(await readBody(event))
  const existing = await db.query.questionBank.findFirst({ where: eq(questionBank.id, id) })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Soal tidak ditemukan' })
  if (user.role !== 'admin' && existing.createdBy !== user.id && existing.scope !== 'global') throw createError({ statusCode: 403, statusMessage: 'Bukan pemilik soal' })
  await db.update(questionBank).set(body).where(eq(questionBank.id, id))
  return { success: true }
})
