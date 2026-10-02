import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { activities, forumDiscussions, sections } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { findCourseOrThrow, isCourseManager } from '~~/server/utils/courseAccess'

const schema = z.object({ title: z.string().trim().min(1).max(200), question: z.string().trim().min(1).max(10000) })
export default defineEventHandler(async (event) => {
  const { user, organization } = await requireOrganization(event)
  const courseId = getRouterParam(event, 'id')!
  const activityId = getRouterParam(event, 'activityId')!
  const body = schema.parse(await readBody(event))
  await findCourseOrThrow(courseId, organization.id)
  if (!['admin', 'org_admin', 'owner'].includes(user.role) && !await isCourseManager(user.id, courseId)) throw createError({ statusCode: 403, statusMessage: 'Hanya guru/admin' })
  const activity = await db.query.activities.findFirst({ where: eq(activities.id, activityId) })
  const section = activity && await db.query.sections.findFirst({ where: eq(sections.id, activity.sectionId) })
  if (!activity || activity.type !== 'forum' || !section || section.courseId !== courseId) throw createError({ statusCode: 404, statusMessage: 'Forum tidak ditemukan' })
  const [discussion] = await db.insert(forumDiscussions).values({ id: crypto.randomUUID(), activityId, title: body.title, question: body.question, createdBy: user.id }).returning()
  return { data: discussion }
})
