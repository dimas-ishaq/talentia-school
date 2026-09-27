import { and, eq } from 'drizzle-orm'
import { db } from '~~/server/utils/db'
import { announcements } from '~~/server/database/schema'
import { announcementSchema } from '~~/shared/schemas/announcement'
import { requireAnnouncementManager } from '~~/server/utils/announcementAccess'

export default defineEventHandler(async (event) => {
  const { organization } = await requireAnnouncementManager(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID tidak valid' })

  const { title, content, isPublished } = await readValidatedBody(event, announcementSchema.parse)

  const existing = await db.query.announcements.findFirst({
    where: and(eq(announcements.id, id), eq(announcements.organizationId, organization.id)),
    columns: { id: true, publishedAt: true },
  })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Pengumuman tidak ditemukan' })

  // publishedAt dipertahankan saat sudah terbit; diisi saat baru diterbitkan.
  const publishedAt = isPublished ? (existing.publishedAt ?? new Date()) : null

  const [updated] = await db
    .update(announcements)
    .set({ title, content, isPublished, publishedAt })
    .where(eq(announcements.id, id))
    .returning()

  return { success: true, data: updated }
})
