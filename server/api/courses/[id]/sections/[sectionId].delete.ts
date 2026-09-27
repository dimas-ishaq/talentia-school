import { eq } from 'drizzle-orm'
import { sections } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireCourseManager } from '~~/server/utils/courseAccess'

export default defineEventHandler(async (event) => {
  const courseId = getRouterParam(event, 'id')!
  const sectionId = getRouterParam(event, 'sectionId')!
  await requireCourseManager(event, courseId)
  const [deleted] = await db.delete(sections).where(eq(sections.id, sectionId)).returning({ id: sections.id })
  if (!deleted) throw createError({ statusCode: 404, statusMessage: 'Section tidak ditemukan' })
  return { success: true }
})