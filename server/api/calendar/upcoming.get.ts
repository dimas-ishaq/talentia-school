// GET /api/calendar/upcoming — agenda publik/internal 14 hari mendatang
import { and, asc, eq, gte, inArray, lte, or, isNull } from 'drizzle-orm'
import { calendarEvents, examEvents } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const today = new Date().toISOString().slice(0, 10)
  const limitDate = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10)
  const visibilities = ['public']
  if (user.role === 'admin' || user.role === 'teacher') visibilities.push('internal')
  if (user.role === 'admin') visibilities.push('private')

  const custom = await db.query.calendarEvents.findMany({
    where: and(
      inArray(calendarEvents.visibility, visibilities as any),
      lte(calendarEvents.startDate, limitDate),
      or(gte(calendarEvents.endDate, today), isNull(calendarEvents.endDate), gte(calendarEvents.startDate, today)),
    ),
    orderBy: [asc(calendarEvents.startDate)],
    limit: 14,
  })

  const exams = await db.query.examEvents.findMany({
    where: and(eq(examEvents.status, 'published'), lte(examEvents.startDate, limitDate), gte(examEvents.endDate, today)),
    orderBy: [asc(examEvents.startDate)],
    limit: 14,
  })

  const data = [
    ...custom.map((e) => ({ id: `cal_${e.id}`, title: e.title, startDate: e.startDate, endDate: e.endDate, type: e.type, color: e.color || '#64748b', isHoliday: e.isHoliday, source: 'custom' })),
    ...exams.map((e) => ({ id: `exam_${e.id}`, title: e.name, startDate: e.startDate, endDate: e.endDate, type: 'exam', color: '#ef4444', isHoliday: false, source: 'exam' })),
  ].sort((a, b) => a.startDate.localeCompare(b.startDate)).slice(0, 7)
    .map((e) => ({ ...e, daysUntil: Math.max(0, Math.ceil((new Date(`${e.startDate}T00:00:00`).getTime() - Date.now()) / 864e5)) }))

  return { data }
})
