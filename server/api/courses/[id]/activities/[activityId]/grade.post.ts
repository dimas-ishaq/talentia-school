// server/api/courses/[id]/activities/[activityId]/grade.post.ts
// Guru menilai submission aktivitas (assignment/forum) seorang siswa.
import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { activities, sections, students, activityProgress } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireCourseManager } from '~~/server/utils/courseAccess'
import { writeAuditLog } from '~~/server/utils/audit'

const schema = z.object({
  studentId: z.string().min(1),
  score: z.number().min(0).max(10000),
  feedback: z.string().trim().max(5000).optional().default(''),
})

export default defineEventHandler(async (event) => {
  const courseId = getRouterParam(event, 'id')!
  const activityId = getRouterParam(event, 'activityId')!
  const manager = await requireCourseManager(event, courseId)
  const body = schema.parse(await readBody(event))

  // Validasi activity milik course ini
  const [activity] = await db
    .select({ id: activities.id, type: activities.type, points: activities.points, maxPoint: activities.maxPoint })
    .from(activities)
    .innerJoin(sections, eq(activities.sectionId, sections.id))
    .where(and(eq(activities.id, activityId), eq(sections.courseId, courseId)))
    .limit(1)
  if (!activity) throw createError({ statusCode: 404, statusMessage: 'Activity tidak ditemukan di course ini' })

  const maxScore = activity.type === 'quiz' ? Number(activity.maxPoint) || 100 : Number(activity.points) || 100
  if (body.score > maxScore) {
    throw createError({ statusCode: 400, statusMessage: `Nilai melebihi maksimum (${maxScore})` })
  }

  const student = await db.query.students.findFirst({ where: eq(students.id, body.studentId), columns: { id: true } })
  if (!student) throw createError({ statusCode: 404, statusMessage: 'Siswa tidak ditemukan' })

  const existing = await db.query.activityProgress.findFirst({
    where: and(eq(activityProgress.activityId, activityId), eq(activityProgress.studentId, body.studentId)),
  })

  const now = new Date()
  if (existing) {
    await db.update(activityProgress).set({
      score: body.score,
      feedback: body.feedback || null,
      gradedAt: now,
      completedAt: existing.completedAt ?? now,
      submittedAt: existing.submittedAt ?? now,
      // Fase 3: grading guru belum publish. Endpoint publish/unpublish
      // menentukan kapan siswa bisa melihat nilai.
      scorePublishedAt: existing.scorePublishedAt ?? null,
    }).where(eq(activityProgress.id, existing.id))
  } else {
    await db.insert(activityProgress).values({
      id: crypto.randomUUID(),
      activityId,
      studentId: body.studentId,
      score: body.score,
      feedback: body.feedback || null,
      gradedAt: now,
      completedAt: now,
      submittedAt: now,
      viewedAt: now,
    })
  }

  await writeAuditLog({ userId: manager.id, action: 'grade.activity_update', target: activityId, metadata: { studentId: body.studentId, score: body.score } })
  return { success: true, data: { score: body.score, gradedAt: now.toISOString() } }
})
