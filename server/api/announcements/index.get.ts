import { eq, and, desc } from 'drizzle-orm'
import { announcements, users } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireOrganization } from '~~/server/utils/tenant'

const MANAGER_ROLES = ['admin', 'org_admin', 'owner', 'teacher']

export default defineEventHandler(async (event) => {
  const { user, organization } = await requireOrganization(event)
  const isManager = MANAGER_ROLES.includes(user.role)

  // Manager melihat semua pengumuman (termasuk draft); pengguna lain hanya yang terbit.
  const condition = isManager
    ? eq(announcements.organizationId, organization.id)
    : and(eq(announcements.organizationId, organization.id), eq(announcements.isPublished, true))

  const rows = await db
    .select({
      id: announcements.id,
      title: announcements.title,
      content: announcements.content,
      isPublished: announcements.isPublished,
      publishedAt: announcements.publishedAt,
      createdAt: announcements.createdAt,
      authorId: announcements.authorId,
      authorName: users.name,
    })
    .from(announcements)
    .leftJoin(users, eq(announcements.authorId, users.id))
    .where(condition)
    .orderBy(desc(announcements.createdAt))
    .limit(100)

  return { data: rows, canManage: isManager }
})
