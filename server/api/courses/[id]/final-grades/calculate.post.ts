// server/api/courses/[id]/final-grades/calculate.post.ts
// Hitung dan simpan snapshot nilai akhir untuk seluruh siswa pada course.
// Snapshot lama diganti; feedback guru per siswa dipertahankan.
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { finalGrades } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireCourseManager } from '~~/server/utils/courseAccess'
import { calculateCourseGrades, getCourseWeights, ACTIVITY_TYPES } from '~~/server/utils/courseGrades'

const schema = z.object({
  weightsOverride: z.record(z.enum(ACTIVITY_TYPES), z.number()).optional(),
})

export default defineEventHandler(async (event) => {
  const courseId = getRouterParam(event, 'id')!
  await requireCourseManager(event, courseId)
  const body = schema.parse((await readBody(event)) ?? {})

  const weights = body.weightsOverride ?? await getCourseWeights(courseId)
  if (!Object.keys(weights).length) {
    throw createError({ statusCode: 400, statusMessage: 'Konfigurasi bobot nilai belum diatur' })
  }

  const grades = await calculateCourseGrades(courseId, weights)
  const { user } = await requireUserSession(event)

  // Simpan feedback yang sudah ada agar tidak hilang saat re-kalkulasi.
  const previous = await db
    .select({ studentId: finalGrades.studentId, feedback: finalGrades.feedback, publishedAt: finalGrades.publishedAt, version: finalGrades.version })
    .from(finalGrades)
    .where(eq(finalGrades.courseId, courseId))
  const feedbackMap = new Map(previous.filter((p) => p.feedback).map((p) => [p.studentId, p.feedback!]))
  const publishedMap = new Map(previous.filter((p) => p.publishedAt).map((p) => [p.studentId, p.publishedAt!]))
  const maxVersion = previous.reduce((max, p) => Math.max(max, p.version), 0)
  const nextVersion = maxVersion + 1

  const now = new Date()
  await db.delete(finalGrades).where(eq(finalGrades.courseId, courseId))

  if (grades.length) {
    await db.insert(finalGrades).values(grades.map((g) => ({
      id: crypto.randomUUID(),
      courseId,
      studentId: g.studentId,
      score: g.score,
      grade: g.grade,
      feedback: feedbackMap.get(g.studentId) ?? null,
      componentsJson: JSON.stringify(g.components),
      calculatedAt: now,
      calculatedBy: user.id,
      publishedAt: publishedMap.get(g.studentId) ?? null,
      version: nextVersion,
    })))
  }

  return { success: true, data: { version: nextVersion, count: grades.length } }
})
