import { eq } from 'drizzle-orm'
import { questionBank } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireOrganization } from '~~/server/utils/tenant'

export default defineEventHandler(async (event) => {
  // ponytail: question_bank tanpa kolom organization_id. Tenant via creator membership.
  const { user } = await requireOrganization(event)
  if (!['admin', 'teacher'].includes(user.role)) throw createError({ statusCode: 403, statusMessage: 'Hanya guru atau admin' })
  const id = getRouterParam(event, 'id')!
  const existing = await db.query.questionBank.findFirst({ where: eq(questionBank.id, id) })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Soal tidak ditemukan' })
  if (user.role !== 'admin' && existing.createdBy !== user.id) throw createError({ statusCode: 403, statusMessage: 'Bukan pemilik soal' })
  await db.update(questionBank).set({ isActive: false }).where(eq(questionBank.id, id))
  return { success: true }
})
