// Publish / unpublish nilai: dipakai untuk dua hal sekaligus:
//  1) activityProgress.scorePublishedAt (nilai per activity)
//  2) finalGrades.publishedAt (nilai akhir)
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { activityProgress, activities, sections, finalGrades } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireCourseManager } from '~~/server/utils/courseAccess'

const schema = z.object({
  scope: z.enum(['activity_scores', 'final_grades', 'all']).default('all'),
  publish: z.boolean().optional().default(true),
})

export default defineEventHandler(async (event) => {
  const courseId = getRouterParam(event, 'id')!
  await requireCourseManager(event, courseId)
  const body = schema.parse((await readBody(event)) ?? {})
  const now = body.publish ? new Date() : null

  let updatedActivities = 0
  if (body.scope === 'activity_scores' || body.scope === 'all') {
    const actIds = (await db.select({ id: activities.id }).from(activities).innerJoin(sections, eq(activities.sectionId, sections.id)).where(eq(sections.courseId, courseId))).map((r) => r.id)
    if (actIds.length) {
      const all = await db.select().from(activityProgress)
      const affected = all.filter((row) => actIds.includes(row.activityId))
      for (const row of affected) {
        if ((now && !row.scorePublishedAt) || (!now && row.scorePublishedAt)) {
          await db.update(activityProgress).set({ scorePublishedAt: now }).where(eq(activityProgress.id, row.id))
          updatedActivities++
        }
      }
    }
  }

  let updatedFinals = 0
  if (body.scope === 'final_grades' || body.scope === 'all') {
    const all = await db.select({ id: finalGrades.id, publishedAt: finalGrades.publishedAt }).from(finalGrades).where(eq(finalGrades.courseId, courseId))
    for (const row of all) {
      if ((now && !row.publishedAt) || (!now && row.publishedAt)) {
        await db.update(finalGrades).set({ publishedAt: now }).where(eq(finalGrades.id, row.id))
        updatedFinals++
      }
    }
  }

  return { success: true, data: { updatedActivities, updatedFinals, published: body.publish } }
})
