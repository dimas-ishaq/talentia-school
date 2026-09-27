import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { activities, forumDiscussions, sections } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { findCourseOrThrow, isCourseManager } from '~~/server/utils/courseAccess'

const schema = z.object({ title: z.string().trim().min(1).max(200), question: z.string().trim().min(1).max(10000) })

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const courseId = getRouterParam(event, 'id')!
  const activityId = getRouterParam(event, 'activityId')!
  const discussionId = getRouterParam(event, 'discussionId')!
  const body = schema.parse(await readBody(event))
  await findCourseOrThrow(courseId)
  if (!(await isCourseManager(user.id, courseId))) throw createError({ statusCode: 403, statusMessage: 'Hanya guru/admin' })
  const activity = await db.query.activities.findFirst({ where: eq(activities.id, activityId) })
  const section = activity && await db.query.sections.findFirst({ where: eq(sections.id, activity.sectionId) })
  if (!activity || activity.type !== 'forum' || !section || section.courseId !== courseId) throw createError({ statusCode: 404, statusMessage: 'Forum tidak ditemukan' })
  const discussion = await db.query.forumDiscussions.findFirst({ where: and(eq(forumDiscussions.id, discussionId), eq(forumDiscussions.activityId, activityId)) })
  if (!discussion) throw createError({ statusCode: 404, statusMessage: 'Diskusi tidak ditemukan' })
  const [updated] = await db.update(forumDiscussions).set({ title: body.title, question: body.question, updatedAt: new Date() }).where(eq(forumDiscussions.id, discussionId)).returning()
  return { data: updated }
})
