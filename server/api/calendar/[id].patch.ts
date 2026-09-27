// server/api/calendar/[id].patch.ts
// PATCH /api/calendar/:id — edit agenda akademik (admin-only).
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '~~/server/utils/db'
import { calendarEvents } from '~~/server/database/schema'
import { requireAdmin } from '~~/server/utils/requireAdmin'
import { CALENDAR_EVENT_TYPES, EVENT_TYPE_META, isValidDateString } from '~~/server/utils/calendar'

const dateString = z.string().refine(isValidDateString, 'Format tanggal harus YYYY-MM-DD valid')

const schema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  startDate: dateString.optional(),
  endDate: dateString.nullable().optional(),
  location: z.string().trim().max(200).nullable().optional(),
  type: z.enum(CALENDAR_EVENT_TYPES).optional(),
  category: z.string().trim().max(100).nullable().optional(),
  isHoliday: z.boolean().optional(),
  visibility: z.enum(['public', 'internal', 'private']).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Warna harus format hex #RRGGBB').nullable().optional(),
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID tidak valid' })

  const parsed = schema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: parsed.error.issues[0]?.message ?? 'Data tidak valid' })
  }

  const existing = await db.query.calendarEvents.findFirst({ where: eq(calendarEvents.id, id) })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Agenda tidak ditemukan' })

  const next = { ...existing, ...parsed.data }
  if (next.endDate && next.endDate < next.startDate) {
    throw createError({ statusCode: 400, statusMessage: 'Tanggal selesai harus setelah atau sama dengan tanggal mulai' })
  }

  const [updated] = await db
    .update(calendarEvents)
    .set({
      title: parsed.data.title ?? existing.title,
      description: parsed.data.description !== undefined ? (parsed.data.description?.trim() || null) : existing.description,
      startDate: parsed.data.startDate ?? existing.startDate,
      endDate: parsed.data.endDate !== undefined ? parsed.data.endDate : existing.endDate,
      location: parsed.data.location !== undefined ? (parsed.data.location?.trim() || null) : existing.location,
      type: parsed.data.type ?? existing.type,
      category: parsed.data.category !== undefined ? (parsed.data.category?.trim() || null) : existing.category,
      isHoliday: parsed.data.isHoliday ?? existing.isHoliday,
      visibility: parsed.data.visibility ?? existing.visibility,
      color: parsed.data.color !== undefined ? parsed.data.color : (existing.color || EVENT_TYPE_META[(parsed.data.type ?? existing.type) as keyof typeof EVENT_TYPE_META].color),
      updatedAt: new Date(),
    })
    .where(eq(calendarEvents.id, id))
    .returning()

  return { success: true, data: updated }
})
