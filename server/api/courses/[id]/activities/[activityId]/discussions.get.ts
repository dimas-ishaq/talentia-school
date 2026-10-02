import { asc, eq } from 'drizzle-orm'
import { activities, forumDiscussions, forumPosts, sections, users } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { findCourseOrThrow } from '~~/server/utils/courseAccess'
import { requireOrganization } from '~~/server/utils/tenant'

export default defineEventHandler(async (event) => {
  const { user, organization } = await requireOrganization(event)
  const courseId = getRouterParam(event, 'id')!
  const activityId = getRouterParam(event, 'activityId')!
  await findCourseOrThrow(courseId, organization.id)
  const activity = await db.query.activities.findFirst({ where: eq(activities.id, activityId) })
  const section = activity && await db.query.sections.findFirst({ where: eq(sections.id, activity.sectionId) })
  if (!activity || activity.type !== 'forum' || !section || section.courseId !== courseId || (user.role === 'student' && !activity.isVisible)) throw createError({ statusCode: 404, statusMessage: 'Forum tidak ditemukan' })
  const discussions = await db.select({ id: forumDiscussions.id, title: forumDiscussions.title, question: forumDiscussions.question, createdAt: forumDiscussions.createdAt, authorName: users.name }).from(forumDiscussions).innerJoin(users, eq(users.id, forumDiscussions.createdBy)).where(eq(forumDiscussions.activityId, activityId)).orderBy(asc(forumDiscussions.createdAt))
  const posts = await db.select({ id: forumPosts.id, discussionId: forumPosts.discussionId, parentId: forumPosts.parentId, userId: forumPosts.userId, content: forumPosts.content, createdAt: forumPosts.createdAt, authorName: users.name }).from(forumPosts).innerJoin(users, eq(users.id, forumPosts.userId)).where(eq(forumPosts.activityId, activityId)).orderBy(asc(forumPosts.createdAt))
  return { data: { activity: { id: activity.id, title: activity.title, forumRequirePost: activity.forumRequirePost, forumRequireReply: activity.forumRequireReply, forumCompletionRule: activity.forumCompletionRule }, discussions, posts } }
})
