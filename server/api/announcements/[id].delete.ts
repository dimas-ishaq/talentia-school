import { and, eq } from 'drizzle-orm'
import { db } from '~~/server/utils/db'
import { announcements } from '~~/server/database/schema'
import { requireAnnouncementManager } from '~~/server/utils/announcementAccess'

export default defineEventHandler(async (event) => {
  const { organization } = await requireAnnouncementManager(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID tidak valid' })

  const [deleted] = await db
    .delete(announcements)
    .where(and(eq(announcements.id, id), eq(announcements.organizationId, organization.id)))
    .returning({ id: announcements.id })

  if (!deleted) throw createError({ statusCode: 404, statusMessage: 'Pengumuman tidak ditemukan' })

  return { success: true }
})
