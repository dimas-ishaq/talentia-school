import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { activities, students, courseClasses, courseTeachers, teachers, sections, activityProgress } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { findCourseOrThrow } from '~~/server/utils/courseAccess'

const schema = z.object({
  submission: z.string().trim().max(5000).optional(),
})

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  if (user.role !== 'student') throw createError({ statusCode: 403, statusMessage: 'Hanya siswa' })

  const courseId = getRouterParam(event, 'id')!
  const activityId = getRouterParam(event, 'activityId')!
  const body = schema.parse((await readBody(event)) ?? {})

  await findCourseOrThrow(courseId)

  const student = await db.query.students.findFirst({
    where: eq(students.userId, user.id),
    columns: { id: true, classId: true },
  })
  if (!student?.classId) throw createError({ statusCode: 403, statusMessage: 'Data siswa tidak ditemukan' })

  // Siswa harus terdaftar di course (kelasnya diassign ke course)
  const enrolled = await db.query.courseClasses.findFirst({
    where: and(eq(courseClasses.courseId, courseId), eq(courseClasses.classId, student.classId)),
    columns: { courseId: true },
  })
  if (!enrolled) throw createError({ statusCode: 403, statusMessage: 'Anda tidak terdaftar di course ini' })

  const activity = await db.query.activities.findFirst({
    where: eq(activities.id, activityId),
    columns: { id: true, type: true, sectionId: true, dueDate: true, isVisible: true },
  })
  if (!activity) throw createError({ statusCode: 404, statusMessage: 'Activity tidak ditemukan' })

  // Pastikan activity milik course ini (via section)
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
  const values: Record<string, any> = {}
  const submitTypes = ['assignment', 'quiz', 'forum']
  if (submitTypes.includes(activity.type) && body.submission !== undefined) {
    values.submission = body.submission
    values.submittedAt = existing?.submittedAt ?? now
    values.viewedAt = existing?.viewedAt ?? now
  } else {
    values.viewedAt = existing?.viewedAt ?? now
  }

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

  return { success: true }
})