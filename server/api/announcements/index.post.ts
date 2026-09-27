import { db } from '~~/server/utils/db'
import { announcements } from '~~/server/database/schema'
import { announcementSchema } from '~~/shared/schemas/announcement'
import { requireAnnouncementManager } from '~~/server/utils/announcementAccess'

export default defineEventHandler(async (event) => {
  const { user, organization } = await requireAnnouncementManager(event)
  const { title, content, isPublished } = await readValidatedBody(event, announcementSchema.parse)

  const [created] = await db
    .insert(announcements)
    .values({
      id: crypto.randomUUID(),
      organizationId: organization.id,
      title,
      content,
      authorId: user.id,
      isPublished,
      publishedAt: isPublished ? new Date() : null,
    })
    .returning()

  return { success: true, data: created }
})
