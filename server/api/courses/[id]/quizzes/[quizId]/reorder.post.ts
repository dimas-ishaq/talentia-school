import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { quizQuestions } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireQuizActivity, assertQuizEditable } from '~~/server/utils/quiz'
import { requireCourseManager } from '~~/server/utils/courseAccess'

const schema = z.object({
  order: z.array(z.string()).min(1),
})

export default defineEventHandler(async (event) => {
  const courseId = getRouterParam(event, 'id')!
  const quizId = getRouterParam(event, 'quizId')!
  await requireCourseManager(event, courseId)
  await requireQuizActivity(event, courseId, quizId)
  await assertQuizEditable(quizId)
  const body = schema.parse(await readBody(event))

  const order = body.order.filter((v, i, a) => a.indexOf(v) === i)
  const current = await db.select({ id: quizQuestions.id }).from(quizQuestions).where(eq(quizQuestions.activityId, quizId))
  const owned = new Set(current.map((r) => r.id))
  const safeOrder = order.filter((id) => owned.has(id))
  // Terapkan urutan hanya untuk soal quiz ini; abaikan ID asing.
  let pos = 1
  for (const id of safeOrder) {
    await db.update(quizQuestions).set({ position: pos++ }).where(and(eq(quizQuestions.id, id), eq(quizQuestions.activityId, quizId)))
  }
  return { success: true }
})
