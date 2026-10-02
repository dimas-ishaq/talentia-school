// server/api/calendar/[id].ical.get.ts
// GET /api/calendar/:id.ical — export satu agenda ke format ICS/iCalendar.
import { and, eq } from 'drizzle-orm'
import { calendarEvents, examEvents } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { EVENT_TYPE_META } from '~~/server/utils/calendar'
import { requireOrganization } from '~~/server/utils/tenant'

interface IcalEvent {
  id: string
  title: string
  description: string | null
  startDate: string
  endDate: string | null
  location: string | null
  type: string
  category: string | null
  isHoliday: boolean
  color: string | null
}

export default defineEventHandler(async (h3) => {
  const { organization } = await requireOrganization(h3)
  const rawId = getRouterParam(h3, 'id') ?? ''
  const eventId = rawId.replace(/^(cal_|exam_)/, '')
  if (!eventId) throw createError({ statusCode: 400, statusMessage: 'ID tidak valid' })

  // 1. Cari di agenda custom (tenant-scoped)
  let found: IcalEvent | null = (await db.query.calendarEvents.findFirst({ where: and(eq(calendarEvents.id, eventId), eq(calendarEvents.organizationId, organization.id)) })) ?? null

  // 2. Bila tidak ada, cari di exam_events (tenant-scoped)
  if (!found) {
    const exam = await db.query.examEvents.findFirst({ where: and(eq(examEvents.id, eventId), eq(examEvents.organizationId, organization.id)) })
    if (exam) {
      found = {
        id: exam.id,
        title: exam.name,
        description: exam.description,
        startDate: exam.startDate,
        endDate: exam.endDate,
        location: null,
        type: 'exam',
        category: `${exam.academicYear} • ${exam.semester.toUpperCase()}`,
        isHoliday: false,
        color: EVENT_TYPE_META.exam.color,
      }
    }
  }

  if (!found) throw createError({ statusCode: 404, statusMessage: 'Agenda tidak ditemukan' })

  const formatDateICS = (isoDate: string) => isoDate.replace(/-/g, '')
  const uid = `${found.id}@sekolah.local`
  const escape = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/[\r\n]+/g, ' ')

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sekolah App//Kalender Akademik//ID',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatDateICS(new Date().toISOString().slice(0, 10))}T120000Z`,
    `DTSTART;VALUE=DATE:${formatDateICS(found.startDate)}`,
    // DTEND eksklusif: tambah 1 hari dari tanggal selesai
    `DTEND;VALUE=DATE:${formatDateICS(addDays(found.endDate || found.startDate, 1))}`,
    `SUMMARY:${escape(found.title).slice(0, 120)}`,
    ...(found.description ? [`DESCRIPTION:${escape(found.description)}`] : []),
    ...(found.location ? [`LOCATION:${escape(found.location)}`] : []),
    ...(found.category ? [`CATEGORIES:${escape(found.category)}`] : []),
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'END:VEVENT',
    'END:VCALENDAR',
  ]

  const icsContent = lines.join('\r\n') + '\r\n'
  const filename = `${found.title.slice(0, 50).replace(/[^a-z0-9]+/gi, '_').toLowerCase() || 'agenda'}.ics`

  setResponseHeader(h3, 'Content-Type', 'text/calendar; charset=utf-8')
  setResponseHeader(h3, 'Content-Disposition', `attachment; filename="${filename}"`)
  return icsContent
})

/** Tambah n hari ke string YYYY-MM-DD. */
function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}
