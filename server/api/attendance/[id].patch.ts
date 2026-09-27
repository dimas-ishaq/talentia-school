import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { attendance } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireAttendanceRecordAccess } from '~~/server/utils/attendanceAccess'
import { writeAuditLog } from '~~/server/utils/audit'

const schema = z.object({
  status: z.enum(['present', 'late', 'excused', 'sick', 'absent']),
  note: z.string().max(500).optional().default(''),
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID absensi diperlukan' })
  const body = schema.parse(await readBody(event))

  // Admin boleh semua; guru hanya kelas yang diampu.
  await requireAttendanceRecordAccess(event, id)
  const { user } = await requireUserSession(event)

  const [updated] = await db
    .update(attendance)
    .set({ status: body.status, note: body.note.trim() || null })
    .where(eq(attendance.id, id))
    .returning()
  if (!updated) throw createError({ statusCode: 404, statusMessage: 'Absensi tidak ditemukan' })
  await writeAuditLog({ userId: user.id, action: 'attendance.update', target: id, metadata: { status: body.status } })
  return { success: true, data: updated }
})
