import { asc, eq, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { activities, sections } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireCourseManager } from '~~/server/utils/courseAccess'

const schema = z.object({
  sectionOrders: z.record(z.string(), z.array(z.string())),
})

export default defineEventHandler(async (event) => {
  const courseId = getRouterParam(event, 'id')!
  await requireCourseManager(event, courseId)
  const { sectionOrders } = schema.parse(await readBody(event))

  const sectionRows = await db.select({ id: sections.id }).from(sections).where(eq(sections.courseId, courseId))
  const ownedSections = new Set(sectionRows.map((r) => r.id))
  for (const sectionId of Object.keys(sectionOrders)) {
    if (!ownedSections.has(sectionId)) throw createError({ statusCode: 404, statusMessage: 'Section tidak ditemukan di course ini' })
  }
  if (!Object.keys(sectionOrders).length) return { success: true }

  const actRows = await db
    .select({ id: activities.id, sectionId: activities.sectionId, position: activities.position })
    .from(activities)
    .where(inArray(activities.sectionId, [...ownedSections]))
    .orderBy(asc(activities.position))
  const ownedActivities = new Set(actRows.map((a) => a.id))
  for (const ids of Object.values(sectionOrders)) {
    for (const activityId of ids) {
      if (!ownedActivities.has(activityId)) throw createError({ statusCode: 400, statusMessage: 'Activity tidak ditemukan di course ini' })
    }
  }

  // ID yang dicantumkan di beberapa section hanya dimenangkan section pertama.
  const claimed = new Set<string>()
  for (const [sectionId, ids] of Object.entries(sectionOrders)) {
    const ranked = ids.filter((activityId) => !claimed.has(activityId) && (claimed.add(activityId), true))
    const rest = actRows
      .filter((a) => a.sectionId === sectionId && !claimed.has(a.id))
      .map((a) => a.id)
    let pos = 1
    for (const activityId of [...ranked, ...rest]) {
      await db.update(activities).set({ sectionId, position: pos++ }).where(eq(activities.id, activityId))
    }
  }
  return { success: true }
})
