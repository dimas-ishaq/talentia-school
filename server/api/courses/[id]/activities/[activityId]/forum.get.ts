import { and, asc, eq } from 'drizzle-orm'
import { activities, forumPosts, sections, users } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { findCourseOrThrow } from '~~/server/utils/courseAccess'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const courseId = getRouterParam(event, 'id')!
  const activityId = getRouterParam(event, 'activityId')!
  await findCourseOrThrow(courseId)
  const activity = await db.query.activities.findFirst({ where: eq(activities.id, activityId) })
  if (!activity || activity.type !== 'forum') throw createError({ statusCode: 404, statusMessage: 'Forum tidak ditemukan' })
  const section = await db.query.sections.findFirst({ where: eq(sections.id, activity.sectionId) })
  if (!section || section.courseId !== courseId) throw createError({ statusCode: 404, statusMessage: 'Forum tidak ditemukan' })
  if (user.role === 'student' && !activity.isVisible) throw createError({ statusCode: 404, statusMessage: 'Forum tidak ditemukan' })
  const posts = await db.select({ id: forumPosts.id, activityId: forumPosts.activityId, userId: forumPosts.userId, parentId: forumPosts.parentId, content: forumPosts.content, createdAt: forumPosts.createdAt, updatedAt: forumPosts.updatedAt, authorName: users.name, authorRole: users.role }).from(forumPosts).innerJoin(users, eq(users.id, forumPosts.userId)).where(eq(forumPosts.activityId, activityId)).orderBy(asc(forumPosts.createdAt))
  return { data: { activity: { id: activity.id, title: activity.title, content: activity.content, forumRequirePost: activity.forumRequirePost, forumRequireReply: activity.forumRequireReply }, posts } }
})
