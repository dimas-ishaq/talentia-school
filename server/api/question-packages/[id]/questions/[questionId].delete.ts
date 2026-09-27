import { eq } from 'drizzle-orm'
import { questionBank } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requirePackageManager } from '~~/server/utils/questionPackage'

export default defineEventHandler(async (event) => {
  const packageId = getRouterParam(event, 'id')!
  const questionId = getRouterParam(event, 'questionId')!
  await requirePackageManager(event, packageId)

  const existing = await db.query.questionBank.findFirst({
    where: eq(questionBank.id, questionId),
    columns: { packageId: true },
  })
  if (!existing || existing.packageId !== packageId) throw createError({ statusCode: 404, statusMessage: 'Soal tidak ditemukan di paket ini' })

  await db.update(questionBank).set({ isActive: false }).where(eq(questionBank.id, questionId))
  return { success: true }
})