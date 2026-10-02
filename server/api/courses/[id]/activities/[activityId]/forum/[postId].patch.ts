import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { activities, forumPosts, sections } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { findCourseOrThrow } from '~~/server/utils/courseAccess'
import { requireOrganization } from '~~/server/utils/tenant'

export default defineEventHandler(async (event) => {
  const { user, organization } = await requireOrganization(event)
  const courseId = getRouterParam(event, 'id')!
  const activityId = getRouterParam(event, 'activityId')!
  const postId = getRouterParam(event, 'postId')!
  // Tenant-scoped: course sekolah lain + activity di luar course → 404.
  await findCourseOrThrow(courseId, organization.id)
  const body = z.object({ content: z.string().trim().min(1).max(5000) }).parse(await readBody(event))
  const post = await db.query.forumPosts.findFirst({ where: and(eq(forumPosts.id, postId), eq(forumPosts.activityId, activityId)) })
  if (!post) throw createError({ statusCode: 404, statusMessage: 'Post tidak ditemukan' })
  const activity = await db.query.activities.findFirst({ where: eq(activities.id, activityId), columns: { sectionId: true } })
  const section = activity && await db.query.sections.findFirst({ where: eq(sections.id, activity.sectionId), columns: { courseId: true } })
  if (!section || section.courseId !== courseId) throw createError({ statusCode: 404, statusMessage: 'Post tidak ditemukan' })
  if (post.userId !== user.id && !['admin', 'org_admin', 'owner', 'teacher'].includes(user.role)) throw createError({ statusCode: 403, statusMessage: 'Akses ditolak' })
  const [updated] = await db.update(forumPosts).set({ content: body.content, updatedAt: new Date() }).where(eq(forumPosts.id, postId)).returning()
  return { data: updated }
})
