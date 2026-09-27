import { eq, and } from 'drizzle-orm'
import { settings } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireOrganizationAdmin } from '~~/server/utils/tenant'

export default defineEventHandler(async (event) => {
  const { organization } = await requireOrganizationAdmin(event)
  const key = getRouterParam(event, 'key')
  if (!key) throw createError({ statusCode: 400, statusMessage: 'Key pengaturan diperlukan' })

  const [deleted] = await db.delete(settings).where(and(eq(settings.key, key), eq(settings.organizationId, organization.id))).returning({ key: settings.key })
  if (!deleted) throw createError({ statusCode: 404, statusMessage: 'Pengaturan tidak ditemukan' })

  return { success: true }
})
