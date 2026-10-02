// server/api/courses/[id]/activities/[activityId]/complete.post.ts
// Siswa menandai activity sebagai selesai — dipakai untuk link dengan
// linkCompletionRule = complete dan activity yang visible = manual.
// Fase 1: evaluasi completion terpusat; endpoint ini juga mengisi viewedAt.
import { eq, and } from 'drizzle-orm'
import { activities, students, courseClasses, sections, activityProgress } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { findCourseOrThrow } from '~~/server/utils/courseAccess'
import { requireOrganization } from '~~/server/utils/tenant'
import { evaluateCompletion } from '~~/server/utils/completion'

export default defineEventHandler(async (event) => {
  const { user, organization } = await requireOrganization(event)
  if (user.role !== 'student') throw createError({ statusCode: 403, statusMessage: 'Hanya siswa' })

  const courseId = getRouterParam(event, 'id')!
  const activityId = getRouterParam(event, 'activityId')!
  await findCourseOrThrow(courseId, organization.id)

  const student = await db.query.students.findFirst({
    where: and(eq(students.userId, user.id), eq(students.organizationId, organization.id)),
    columns: { id: true, classId: true },
  })
  if (!student?.classId) throw createError({ statusCode: 403, statusMessage: 'Data siswa tidak ditemukan' })

  const enrolled = await db.query.courseClasses.findFirst({
    where: and(eq(courseClasses.courseId, courseId), eq(courseClasses.classId, student.classId)),
    columns: { courseId: true },
  })
  if (!enrolled) throw createError({ statusCode: 403, statusMessage: 'Anda tidak terdaftar di course ini' })

  const activity = await db.query.activities.findFirst({ where: eq(activities.id, activityId) })
  if (!activity) throw createError({ statusCode: 404, statusMessage: 'Activity tidak ditemukan' })

  const section = await db.query.sections.findFirst({
    where: eq(sections.id, activity.sectionId),
    columns: { courseId: true },
  })
  if (!section || section.courseId !== courseId) {
    throw createError({ statusCode: 404, statusMessage: 'Activity tidak ditemukan di course ini' })
  }

  const existing = await db.query.activityProgress.findFirst({
    where: and(eq(activityProgress.activityId, activityId), eq(activityProgress.studentId, student.id)),
  })

  const now = new Date()
  const values: Record<string, any> = { viewedAt: existing?.viewedAt ?? now }
  // Link dengan rule complete memang ditandai manual lewat endpoint ini.
  // Activity lain yang sudah lewat evaluateCompletion juga bisa final lewat sini,
  // sehingga UI tidak perlu menebak.
  const merged = { ...existing, ...values }
  const decision = evaluateCompletion({ activity, progress: { ...merged, completedAt: now } })
  values.completedAt = decision.done ? (existing?.completedAt ?? now) : null

  if (existing) {
    await db.update(activityProgress).set(values).where(eq(activityProgress.id, existing.id))
  } else {
    await db.insert(activityProgress).values({
      id: crypto.randomUUID(),
      activityId,
      studentId: student.id,
      ...values,
    })
  }

  return { success: true, data: { completedAt: values.completedAt, done: decision.done, reason: decision.reason } }
})
