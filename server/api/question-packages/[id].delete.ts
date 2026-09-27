import { eq } from 'drizzle-orm'
import { questionPackages } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requirePackageManager } from '~~/server/utils/questionPackage'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  await requirePackageManager(event, id)
  await db.update(questionPackages).set({ isActive: false }).where(eq(questionPackages.id, id))
  return { success: true }
})
