// server/api/courses/[id]/final-grades/[studentId].patch.ts
// Ubah feedback nilai akhir seorang siswa (tanpa menghitung ulang).
import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { finalGrades } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireCourseManager } from '~~/server/utils/courseAccess'

const schema = z.object({
  feedback: z.string().trim().max(5000).nullable().optional(),
})

export default defineEventHandler(async (event) => {
  const courseId = getRouterParam(event, 'id')!
  const studentId = getRouterParam(event, 'studentId')!
  await requireCourseManager(event, courseId)
  const body = schema.parse(await readBody(event))

  const [existing] = await db.select({ id: finalGrades.id }).from(finalGrades)
    .where(and(eq(finalGrades.courseId, courseId), eq(finalGrades.studentId, studentId))).limit(1)
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Nilai akhir belum dihitung' })

  await db.update(finalGrades).set({ feedback: body.feedback ?? null }).where(eq(finalGrades.id, existing.id))
  return { success: true }
})
