import { eq } from 'drizzle-orm'
import { courses } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireCourseManager, findCourseOrThrow } from '~~/server/utils/courseAccess'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  await requireCourseManager(event, id)
  await db.delete(courses).where(eq(courses.id, id))
  return { success: true }
})