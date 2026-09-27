import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { sections } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireCourseManager } from '~~/server/utils/courseAccess'
import { findCourseOrThrow } from '~~/server/utils/courseAccess'

export default defineEventHandler(async (event) => {
  const courseId = getRouterParam(event, 'id')!
  const sectionId = getRouterParam(event, 'sectionId')!
  await requireCourseManager(event, courseId)

  const body = z.object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(5000).optional(),
    position: z.number().int().min(0).optional(),
    isVisible: z.boolean().optional(),
  }).parse(await readBody(event))

  const updateData: Record<string, any> = {}
  if (body.title !== undefined) updateData.title = body.title
  if (body.description !== undefined) updateData.description = body.description || null
  if (body.position !== undefined) updateData.position = body.position
  if (body.isVisible !== undefined) updateData.isVisible = body.isVisible

  if (Object.keys(updateData).length) {
    const [updated] = await db.update(sections).set(updateData).where(eq(sections.id, sectionId)).returning({ id: sections.id })
    if (!updated) throw createError({ statusCode: 404, statusMessage: 'Section tidak ditemukan' })
  }
  return { success: true }
})