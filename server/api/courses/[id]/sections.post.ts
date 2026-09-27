import { eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { sections } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireCourseManager } from '~~/server/utils/courseAccess'

const schema = z.object({
  title: z.string().trim().min(1, 'Judul section wajib diisi').max(200),
  description: z.string().trim().max(5000).optional().default(''),
  position: z.number().int().min(0).optional(),
  isVisible: z.boolean().optional().default(true),
})

export default defineEventHandler(async (event) => {
  const courseId = getRouterParam(event, 'id')!
  await requireCourseManager(event, courseId)

  const body = schema.parse(await readBody(event))
  const [maxRow] = await db
    .select({ max: sql<number>`coalesce(max(${sections.position}), 0)` })
    .from(sections)
    .where(eq(sections.courseId, courseId))

  await db.insert(sections).values({
    id: crypto.randomUUID(),
    courseId,
    title: body.title,
    description: body.description || null,
    position: body.position ?? (maxRow?.max ?? 0) + 1,
    isVisible: body.isVisible,
  })

  return { success: true }
})