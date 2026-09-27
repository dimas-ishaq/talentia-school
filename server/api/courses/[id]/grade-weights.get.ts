// server/api/courses/[id]/grade-weights.get.ts
// Ambil konfigurasi bobot nilai per tipe aktivitas untuk sebuah course.
import { getCourseWeights, ACTIVITY_TYPES } from '~~/server/utils/courseGrades'
import { requireCourseManager } from '~~/server/utils/courseAccess'

export default defineEventHandler(async (event) => {
  const courseId = getRouterParam(event, 'id')!
  await requireCourseManager(event, courseId)
  const weights = await getCourseWeights(courseId)
  return { data: { weights, types: ACTIVITY_TYPES } }
})
