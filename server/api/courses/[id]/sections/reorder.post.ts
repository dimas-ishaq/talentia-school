import { asc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { sections } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireCourseManager } from '~~/server/utils/courseAccess'

const schema = z.object({
  order: z.array(z.string()).min(1),
})

export default defineEventHandler(async (event) => {
  const courseId = getRouterParam(event, 'id')!
  await requireCourseManager(event, courseId)
  const { order } = schema.parse(await readBody(event))

  const rows = await db.select({ id: sections.id }).from(sections).where(eq(sections.courseId, courseId)).orderBy(asc(sections.position))
  const owned = new Set(rows.map((r) => r.id))
  const seen = new Set<string>()
  const ranked = order.filter((id) => owned.has(id) && !seen.has(id) && (seen.add(id), true))
  const rest = rows.map((r) => r.id).filter((id) => !seen.has(id))
  let pos = 1
  for (const id of [...ranked, ...rest]) {
    await db.update(sections).set({ position: pos++ }).where(eq(sections.id, id))
  }
  return { success: true }
})
