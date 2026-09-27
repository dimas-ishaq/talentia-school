import { eq } from 'drizzle-orm'
import { activities } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireCourseManager } from '~~/server/utils/courseAccess'

export default defineEventHandler(async (event) => {
  const courseId = getRouterParam(event, 'id')!
  const activityId = getRouterParam(event, 'activityId')!
  await requireCourseManager(event, courseId)
  const [deleted] = await db.delete(activities).where(eq(activities.id, activityId)).returning({ id: activities.id })
  if (!deleted) throw createError({ statusCode: 404, statusMessage: 'Activity tidak ditemukan' })
  return { success: true }
})