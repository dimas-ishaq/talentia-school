// server/api/schedules/index.post.ts
// POST /api/schedules — tambah 1 jadwal baru (admin-only).
import { db } from '~~/server/utils/db'
import { scheduleEntries } from '~~/server/database/schema'
import { z } from 'zod'
import { requireAdmin } from '~~/server/utils/requireAdmin'
import { findScheduleConflict, timeToMinutes } from '~~/server/utils/schedule'
import { requireOrganizationAdmin } from '~~/server/utils/tenant'

const schema = z.object({
  dayOfWeek: z.number().min(1).max(6, 'Hari harus 1-6 (Senin-Sabtu)'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format jam HH:MM'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format jam HH:MM'),
  subjectId: z.string().min(1, 'Mata pelajaran wajib diisi'),
  classId: z.string().min(1, 'Kelas wajib diisi'),
  teacherId: z.string().min(1, 'Guru wajib diisi'),
  room: z.string().max(50).optional().default(''),
  note: z.string().max(255).optional().default(''),
})

export default defineEventHandler(async (event) => {
  const { user, organization } = await requireOrganizationAdmin(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: parsed.error.issues[0]?.message ?? 'Data tidak valid' })
  }

  const { startTime, endTime, dayOfWeek, subjectId, classId, teacherId } = parsed.data

  // Jam selesai harus lebih besar dari jam mulai
  const startMin = timeToMinutes(startTime)
  const endMin = timeToMinutes(endTime)
  if (startMin === null || endMin === null) {
    throw createError({ statusCode: 400, statusMessage: 'Format jam tidak valid' })
  }
  if (endMin <= startMin) {
    throw createError({ statusCode: 400, statusMessage: 'Jam selesai harus lebih besar dari jam mulai' })
  }

  // Cek bentrok
  const conflict = await findScheduleConflict({
    dayOfWeek,
    startTime,
    endTime,
    teacherId,
    classId,
  })
  if (conflict) throw createError({ statusCode: 409, statusMessage: conflict })

  const [created] = await db
    .insert(scheduleEntries)
    .values({
      id: crypto.randomUUID(),
      organizationId: organization.id,
      dayOfWeek,
      startTime,
      endTime,
      subjectId,
      classId,
      teacherId,
      room: parsed.data.room?.trim() || null,
      note: parsed.data.note?.trim() || null,
      createdBy: user.id,
    })
    .returning()

  return { success: true, data: created }
})
