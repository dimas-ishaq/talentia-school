// server/api/schedules/[id].patch.ts
// PATCH /api/schedules/:id — ubah 1 jadwal (admin-only).
import { and, eq } from 'drizzle-orm'
import { db } from '~~/server/utils/db'
import { scheduleEntries } from '~~/server/database/schema'
import { z } from 'zod'
import { requireOrganizationAdmin } from '~~/server/utils/tenant'
import { findScheduleConflict, timeToMinutes } from '~~/server/utils/schedule'

const schema = z.object({
  dayOfWeek: z.number().min(1).max(6).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  subjectId: z.string().min(1).optional(),
  classId: z.string().min(1).optional(),
  teacherId: z.string().min(1).optional(),
  room: z.string().max(50).optional(),
  note: z.string().max(255).optional(),
  isActive: z.boolean().optional(),
})

export default defineEventHandler(async (event) => {
  const { organization } = await requireOrganizationAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID tidak valid' })

  const existing = await db.query.scheduleEntries.findFirst({ where: and(eq(scheduleEntries.id, id), eq(scheduleEntries.organizationId, organization.id)) })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Jadwal tidak ditemukan' })

  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: parsed.error.issues[0]?.message ?? 'Data tidak valid' })

  const merged = {
    dayOfWeek: parsed.data.dayOfWeek ?? existing.dayOfWeek,
    startTime: parsed.data.startTime ?? existing.startTime,
    endTime: parsed.data.endTime ?? existing.endTime,
    subjectId: parsed.data.subjectId ?? existing.subjectId,
    classId: parsed.data.classId ?? existing.classId,
    teacherId: parsed.data.teacherId ?? existing.teacherId,
    room: parsed.data.room !== undefined ? parsed.data.room.trim() || null : existing.room,
    note: parsed.data.note !== undefined ? parsed.data.note.trim() || null : existing.note,
    isActive: parsed.data.isActive ?? existing.isActive,
  }

  const startMin = timeToMinutes(merged.startTime)
  const endMin = timeToMinutes(merged.endTime)
  if (startMin === null || endMin === null) throw createError({ statusCode: 400, statusMessage: 'Format jam tidak valid' })
  if (endMin <= startMin) throw createError({ statusCode: 400, statusMessage: 'Jam selesai harus lebih besar dari jam mulai' })

  // Cek bentrok hanya bila jadwal masih aktif (atau akan diaktifkan)
  if (merged.isActive) {
    const conflict = await findScheduleConflict({
      dayOfWeek: merged.dayOfWeek,
      startTime: merged.startTime,
      endTime: merged.endTime,
      teacherId: merged.teacherId,
      classId: merged.classId,
      excludeId: id,
      organizationId: organization.id,
    })
    if (conflict) throw createError({ statusCode: 409, statusMessage: conflict })
  }

  const [updated] = await db
    .update(scheduleEntries)
    .set(merged as any)
    .where(eq(scheduleEntries.id, id))
    .returning()

  return { success: true, data: updated }
})
