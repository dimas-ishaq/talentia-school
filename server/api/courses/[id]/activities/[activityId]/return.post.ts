// Guru mengembalikan tugas siswa agar siswa bisa submit ulang.
// Menulis returnedAt + returnReason pada activityProgress. Nilai lama tetap ada,
// siswa melihat catatan pengembalian saat membuka activity.
import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { activities, sections, students, activityProgress } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireCourseManager } from '~~/server/utils/courseAccess'
import { writeAuditLog } from '~~/server/utils/audit'

const schema = z.object({
  studentId: z.string().min(1),
  reason: z.string().trim().max(2000).optional().default(''),
})

export default defineEventHandler(async (event) => {
  const courseId = getRouterParam(event, 'id')!
  const activityId = getRouterParam(event, 'activityId')!
  const { user } = await requireUserSession(event)
  const manager = await requireCourseManager(event, courseId)
  const body = schema.parse(await readBody(event))

  const [activity] = await db
    .select({ id: activities.id, type: activities.type })
    .from(activities)
    .innerJoin(sections, eq(activities.sectionId, sections.id))
    .where(and(eq(activities.id, activityId), eq(sections.courseId, courseId)))
    .limit(1)
  if (!activity) throw createError({ statusCode: 404, statusMessage: 'Activity tidak ditemukan' })
  if (!['assignment', 'forum'].includes(activity.type)) throw createError({ statusCode: 400, statusMessage: 'Hanya tugas dan forum yang bisa dikembalikan' })

  const st = await db.query.students.findFirst({ where: eq(students.id, body.studentId), columns: { id: true } })
  if (!st) throw createError({ statusCode: 404, statusMessage: 'Siswa tidak ditemukan' })

  const existing = await db.query.activityProgress.findFirst({
    where: and(eq(activityProgress.activityId, activityId), eq(activityProgress.studentId, body.studentId)),
  })
  if (!existing?.submittedAt) throw createError({ statusCode: 400, statusMessage: 'Siswa belum mengumpulkan' })

  const now = new Date()
  await db.update(activityProgress).set({ returnedAt: now, returnReason: body.reason || null }).where(eq(activityProgress.id, existing.id))
  await writeAuditLog({ userId: user.id, action: 'assignment.returned', target: activityId, metadata: { studentId: body.studentId } })
  return { success: true, data: { returnedAt: now.toISOString() } }
})
