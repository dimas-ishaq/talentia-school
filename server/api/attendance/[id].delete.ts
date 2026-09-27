import { eq } from 'drizzle-orm'
import { attendance } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireAttendanceRecordAccess } from '~~/server/utils/attendanceAccess'
import { writeAuditLog } from '~~/server/utils/audit'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID absensi diperlukan' })
  const { user } = await requireUserSession(event)
  if (user.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Hanya admin boleh menghapus absensi' })
  await requireAttendanceRecordAccess(event, id)
  const [deleted] = await db.delete(attendance).where(eq(attendance.id, id)).returning({ id: attendance.id })
  if (!deleted) throw createError({ statusCode: 404, statusMessage: 'Absensi tidak ditemukan' })
  await writeAuditLog({ userId: user.id, action: 'attendance.delete', target: id })
  return { success: true }
})
