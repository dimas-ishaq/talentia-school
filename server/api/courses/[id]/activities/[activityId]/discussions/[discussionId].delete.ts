import { and, eq } from 'drizzle-orm'
import { forumDiscussions } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { findCourseOrThrow, isCourseManager } from '~~/server/utils/courseAccess'

export default defineEventHandler(async (event) => {
  const { user, organization } = await requireOrganization(event)
  const courseId = getRouterParam(event, 'id')!
  const activityId = getRouterParam(event, 'activityId')!
  const discussionId = getRouterParam(event, 'discussionId')!
  await findCourseOrThrow(courseId, organization.id)
  if (!(await isCourseManager(user.id, courseId))) throw createError({ statusCode: 403, statusMessage: 'Hanya guru/admin' })
  const discussion = await db.query.forumDiscussions.findFirst({ where: and(eq(forumDiscussions.id, discussionId), eq(forumDiscussions.activityId, activityId)) })
  if (!discussion) throw createError({ statusCode: 404, statusMessage: 'Diskusi tidak ditemukan' })
  await db.delete(forumDiscussions).where(eq(forumDiscussions.id, discussionId))
  return { success: true }
})
