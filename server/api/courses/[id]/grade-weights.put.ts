// server/api/courses/[id]/grade-weights.put.ts
// Simpan konfigurasi bobot nilai per tipe aktivitas untuk sebuah course.
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { courses, users, courseGradeWeights } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireCourseManager } from '~~/server/utils/courseAccess'
import { ACTIVITY_TYPES } from '~~/server/utils/courseGrades'

const schema = z.object({
  weights: z.record(z.enum(ACTIVITY_TYPES), z.number().min(0).max(100)),
  isActive: z.boolean().optional(),
})

export default defineEventHandler(async (event) => {
  const courseId = getRouterParam(event, 'id')!
  await requireCourseManager(event, courseId)
  const body = schema.parse(await readBody(event))
  
  // Validate total weight ≈ 100%
  const total = Object.values(body.weights).reduce((sum, v) => sum + Number(v), 0)
  if (total === 0 || Math.abs(total - 100) > 5) {
    throw createError({ statusCode: 400, statusMessage: 'Total bobot harus sekitar 100%' })
  }
  
  const weightsJson = JSON.stringify(body.weights)
  
  try {
    const [existing] = await db.select({ id: courseGradeWeights.id }).from(courseGradeWeights).where(eq(courseGradeWeights.courseId, courseId)).limit(1)
    
    if (existing) {
      await db.update(courseGradeWeights).set({
        weightsJson,
        isActive: body.isActive ?? true,
        updatedAt: new Date(),
      }).where(eq(courseGradeWeights.id, existing.id))
    } else {
      const { user } = await requireUserSession(event)
      await db.insert(courseGradeWeights).values({
        id: crypto.randomUUID(),
        courseId,
        weightsJson,
        isActive: body.isActive ?? true,
        createdBy: user.id,
        updatedAt: new Date(),
      })
    }
    
    return { success: true }
  } catch (error) {
    throw createError({ statusCode: 500, statusMessage: 'Gagal menyimpan konfigurasi bobot' })
  }
})
