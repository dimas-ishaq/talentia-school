// server/api/calendar/index.get.ts
// GET /api/calendar — daftar agenda akademik.
// Menggabungkan dua sumber:
//   1) calendar_events (agenda custom: libur, kegiatan, rapat, lomba, dll)
//   2) exam_events berstatus 'published' (ujian terstruktur) — otomatis tampil.
// Query opsional:
//   from=YYYY-MM-DD, to=YYYY-MM-DD → agenda yang beririsan dengan rentang
//   type=exam|holiday|...          → filter jenis agenda
//   includeInternal=1              → ikut agenda internal (khusus admin/guru)
//   includePrivate=1               → ikut agenda privat (khusus admin)
import { and, asc, eq, gte, lte, or, inArray, isNull } from 'drizzle-orm'
import { calendarEvents, examEvents } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { EVENT_TYPE_META } from '~~/server/utils/calendar'
import { requireOrganization } from '~~/server/utils/tenant'

export default defineEventHandler(async (event) => {
  const { user, organization } = await requireOrganization(event)
  const query = getQuery(event)

  const from = typeof query.from === 'string' ? query.from : undefined
  const to = typeof query.to === 'string' ? query.to : undefined
  const typeFilter = typeof query.type === 'string' ? query.type : undefined
  const includeInternal = query.includeInternal === '1' && (user.role === 'admin' || user.role === 'teacher')
  const includePrivate = query.includePrivate === '1' && user.role === 'admin'

  // Visibilitas sesuai role
  const visibilities: string[] = ['public']
  if (includeInternal) visibilities.push('internal')
  if (includePrivate) visibilities.push('private')

  // Overlap rentang tanggal yang dipakai berulang
  const overlaps = (startCol: any, endCol: any) => from && to
    ? or(
        and(lte(startCol, to), gte(endCol, from)),
        and(lte(startCol, to), isNull(endCol), gte(startCol, from)),
      )
    : undefined

  // 1. Agenda custom dari calendar_events
  const customAgendas = await db.query.calendarEvents.findMany({
    where: and(
      eq(calendarEvents.organizationId, organization.id),
      inArray(calendarEvents.visibility, visibilities as any),
      typeFilter ? eq(calendarEvents.type, typeFilter as any) : undefined,
      overlaps(calendarEvents.startDate, calendarEvents.endDate),
    ),
    with: { creator: { columns: { name: true } } },
    orderBy: [asc(calendarEvents.startDate), asc(calendarEvents.title)],
  })

  // 2. Ujian terpublikasi (hanya bila tidak difilter ke tipe lain)
  const shouldIncludeExams = !typeFilter || typeFilter === 'exam'
  const exams = shouldIncludeExams
    ? (await db.query.examEvents.findMany({
        where: and(
          eq(examEvents.organizationId, organization.id),
          eq(examEvents.status, 'published'),
          overlaps(examEvents.startDate, examEvents.endDate),
        ),
        with: { creator: { columns: { name: true } } },
      })).map((e) => ({
        id: `exam_${e.id}`,
        title: e.name,
        description: e.description,
        startDate: e.startDate,
        endDate: e.endDate,
        location: null,
        type: 'exam' as const,
        category: `${e.academicYear} • ${e.semester.toUpperCase()}`,
        isHoliday: false,
        visibility: 'public' as const,
        color: EVENT_TYPE_META.exam.color,
        createdBy: e.createdBy,
        createdAt: e.createdAt,
        updatedAt: e.createdAt,
        creator: { name: e.creator?.name ?? 'Sekolah' },
        source: 'exam' as const,
      }))
    : []

  // Gabung & urutkan berdasarkan tanggal mulai
  const data = [...customAgendas.map((e) => ({ ...e, source: 'manual' as const })), ...exams].sort((a, b) => {
    const diff = new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    return diff !== 0 ? diff : a.title.localeCompare(b.title)
  })

  return { data }
})
