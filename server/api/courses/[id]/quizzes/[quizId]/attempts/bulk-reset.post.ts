import { and, eq, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { quizAttempts } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireQuizActivity, recomputeProgress } from '~~/server/utils/quiz'
import { requireCourseManager } from '~~/server/utils/courseAccess'

const schema = z.object({
  attemptIds: z.array(z.string().min(1)).min(1).max(100),
})

export default defineEventHandler(async (event) => {
  const courseId = getRouterParam(event, 'id')!
  const quizId = getRouterParam(event, 'quizId')!
  await requireCourseManager(event, courseId)
  await requireQuizActivity(event, courseId, quizId)
  const body = schema.parse(await readBody(event))

  const rows = await db.select().from(quizAttempts).where(and(eq(quizAttempts.activityId, quizId), inArray(quizAttempts.id, body.attemptIds)))
  if (!rows.length) throw createError({ statusCode: 404, statusMessage: 'Tidak ada pengerjaan yang ditemukan' })

  const validIds = rows.map((r) => r.id)
  await db.delete(quizAttempts).where(and(eq(quizAttempts.activityId, quizId), inArray(quizAttempts.id, validIds)))

  const studentIds = [...new Set(rows.map((r) => r.studentId))]
  for (const sid of studentIds) await recomputeProgress(quizId, sid)

  return { success: true, deleted: validIds.length, studentIds }
})
