import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { attendance, courses } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { isCourseManager } from '~~/server/utils/courseAccess'
import { requireOrganization } from '~~/server/utils/tenant'

const schema = z.object({ status: z.enum(['present', 'late', 'excused', 'sick', 'absent']), activityNote: z.string().max(1000).optional().default(''), learningNote: z.string().max(1000).optional().default('') })

export default defineEventHandler(async (event) => {
  const { user, organization } = await requireOrganization(event)
  const courseId = getRouterParam(event, 'id')!
  const attendanceId = getRouterParam(event, 'attendanceId')!
  if (!['admin', 'org_admin', 'owner'].includes(user.role) && !(user.role === 'teacher' && await isCourseManager(user.id, courseId))) throw createError({ statusCode: 403, statusMessage: 'Anda tidak dapat memperbarui logbook ini' })
  const course = await db.query.courses.findFirst({ where: and(eq(courses.id, courseId), eq(courses.organizationId, organization.id)), columns: { id: true } })
  if (!course) throw createError({ statusCode: 404, statusMessage: 'Course tidak ditemukan' })
  const body = schema.parse(await readBody(event))
  const [saved] = await db.update(attendance).set({ status: body.status, note: body.learningNote.trim() || null, activityNote: body.activityNote.trim() || null, learningNote: body.learningNote.trim() || null, recordedBy: user.id }).where(and(eq(attendance.id, attendanceId), eq(attendance.courseId, courseId))).returning()
  if (!saved) throw createError({ statusCode: 404, statusMessage: 'Logbook tidak ditemukan' })
  return { success: true, data: saved }
})
