// server/api/calendar/index.post.ts
// POST /api/calendar — tambah agenda akademik (admin-only).
import { z } from 'zod'
import { db } from '~~/server/utils/db'
import { calendarEvents } from '~~/server/database/schema'
import { requireAdmin } from '~~/server/utils/requireAdmin'
import { CALENDAR_EVENT_TYPES, EVENT_TYPE_META, isValidDateString } from '~~/server/utils/calendar'
import { requireOrganizationAdmin } from '~~/server/utils/tenant'

const dateString = z.string().refine(isValidDateString, 'Format tanggal harus YYYY-MM-DD valid')

const schema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional(),
  startDate: dateString,
  endDate: dateString.optional(),
  location: z.string().trim().max(200).optional(),
  type: z.enum(CALENDAR_EVENT_TYPES).default('other'),
  category: z.string().trim().max(100).optional(),
  isHoliday: z.boolean().default(false),
  visibility: z.enum(['public', 'internal', 'private']).default('public'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Warna harus format hex #RRGGBB').optional(),
})

export default defineEventHandler(async (event) => {
  const { user, organization } = await requireOrganizationAdmin(event)
  const parsed = schema.safeParse(await readBody(event))

  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: parsed.error.issues[0]?.message ?? 'Data tidak valid' })
  }

  const { title, description, startDate, endDate, location, type, category, isHoliday, visibility, color } = parsed.data

  if (endDate && endDate < startDate) {
    throw createError({ statusCode: 400, statusMessage: 'Tanggal selesai harus setelah atau sama dengan tanggal mulai' })
  }

  const [created] = await db
    .insert(calendarEvents)
    .values({
      id: crypto.randomUUID(),
      organizationId: organization.id,
      title,
      description: description?.trim() || null,
      startDate,
      endDate: endDate || null,
      location: location?.trim() || null,
      type,
      category: category?.trim() || null,
      isHoliday,
      visibility,
      color: color || EVENT_TYPE_META[type].color,
      createdBy: user.id,
    })
    .returning()

  return { success: true, data: created }
})
