// server/api/courses/[id]/activities/[activityId]/complete.post.ts
// Tandai materi bacaan (type 'text') sebagai selesai dibaca oleh siswa.
import { eq, and } from 'drizzle-orm'
import { activities, students, courseClasses, sections, activityProgress } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { findCourseOrThrow } from '~~/server/utils/courseAccess'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  if (user.role !== 'student') throw createError({ statusCode: 403, statusMessage: 'Hanya siswa' })

  const courseId = getRouterParam(event, 'id')!
  const activityId = getRouterParam(event, 'activityId')!
  await findCourseOrThrow(courseId)

  const student = await db.query.students.findFirst({
    where: eq(students.userId, user.id),
    columns: { id: true, classId: true },
  })
  if (!student?.classId) throw createError({ statusCode: 403, statusMessage: 'Data siswa tidak ditemukan' })

  const enrolled = await db.query.courseClasses.findFirst({
    where: and(eq(courseClasses.courseId, courseId), eq(courseClasses.classId, student.classId)),
    columns: { courseId: true },
  })
  if (!enrolled) throw createError({ statusCode: 403, statusMessage: 'Anda tidak terdaftar di course ini' })

  const activity = await db.query.activities.findFirst({
    where: eq(activities.id, activityId),
    columns: { id: true, sectionId: true },
  })
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
  const values = { viewedAt: existing?.viewedAt ?? now, completedAt: now }
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

  return { success: true, data: { completedAt: now.toISOString() } }
})
