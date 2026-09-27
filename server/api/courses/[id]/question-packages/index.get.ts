import { and, asc, eq, sql } from 'drizzle-orm'
import { questionBank, questionPackages } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireCourseManager } from '~~/server/utils/courseAccess'

export default defineEventHandler(async (event) => {
  const courseId = getRouterParam(event, 'id')!
  await requireCourseManager(event, courseId)

  const rows = await db
    .select({
      id: questionPackages.id,
      courseId: questionPackages.courseId,
      name: questionPackages.name,
      description: questionPackages.description,
      createdBy: questionPackages.createdBy,
      isActive: questionPackages.isActive,
      createdAt: questionPackages.createdAt,
      questionCount: sql<number>`(select count(*) from ${questionBank} where ${questionBank.packageId} = ${questionPackages.id} and ${questionBank.isActive} = 1)`.as('question_count'),
    })
    .from(questionPackages)
    .where(and(eq(questionPackages.courseId, courseId), eq(questionPackages.isActive, true)))
    .orderBy(asc(questionPackages.name))

  return { data: rows }
})
