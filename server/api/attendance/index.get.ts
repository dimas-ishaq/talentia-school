import { and, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm'
import { attendance, students, users, classes, subjects, teachers } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { allowedAttendanceScopes } from '~~/server/utils/attendanceAccess'
import { normalizePerPage } from '~~/server/utils/pagination'
import { requireOrganization } from '~~/server/utils/tenant'

const STATUSES = ['present', 'late', 'excused', 'sick', 'absent'] as const

function buildSummary(rows: { status: string }[]) {
  const summary: Record<string, number> = { present: 0, late: 0, excused: 0, sick: 0, absent: 0, total: rows.length }
  for (const row of rows) if (row.status in summary) summary[row.status]! += 1
  return summary
}

export default defineEventHandler(async (event) => {
  const { user, organization } = await requireOrganization(event)
  const query = getQuery(event)
  const str = (key: string) => (typeof query[key] === 'string' && query[key] ? (query[key] as string) : undefined)
  const date = str('date')
  const from = str('from')
  const to = str('to')
  const classId = str('classId')
  const subjectId = str('subjectId')
  const page = Math.max(1, Number(query.page) || 1)
  const perPage = normalizePerPage(query.perPage)

  // ----- SISWA: riwayat pribadi -----
  if (user.role === 'student') {
    const student = await db.query.students.findFirst({ where: eq(students.userId, user.id), columns: { id: true } })
    if (!student) throw createError({ statusCode: 404, statusMessage: 'Profil siswa tidak ditemukan' })
    const rows = await db
      .select({
        id: attendance.id,
        date: attendance.date,
        subjectId: attendance.subjectId,
        subjectName: subjects.name,
        status: attendance.status,
        note: attendance.note,
      })
      .from(attendance)
      .leftJoin(subjects, eq(attendance.subjectId, subjects.id))
      .where(and(eq(attendance.organizationId, organization.id), eq(attendance.studentId, student.id)))
      .orderBy(desc(attendance.date))

    const total = rows.length
    const totalPages = Math.max(1, Math.ceil(total / perPage))
    const safePage = Math.min(page, totalPages)
    const paged = rows.slice((safePage - 1) * perPage, safePage * perPage)
    return { data: paged, studentId: student.id, summary: buildSummary(rows), meta: { page: safePage, perPage, total, totalPages } }
  }

  if (!['admin', 'org_admin', 'owner', 'teacher'].includes(user.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Role tidak didukung' })
  }

  // ----- GURU: batasi ke (kelas, mapel) yang diampu -----
  let scopeFilter: string[] | null = null
  if (user.role === 'teacher') {
    const scopes = (await allowedAttendanceScopes(event)) ?? []
    if (!scopes.length) return { data: [], summary: buildSummary([]) }
    scopeFilter = scopes.map((s) => `${s.classId}|${s.subjectId}`)
  }

  const filters = [
    eq(attendance.organizationId, organization.id),
    date ? eq(attendance.date, date) : undefined,
    from ? gte(attendance.date, from) : undefined,
    to ? lte(attendance.date, to) : undefined,
    classId ? eq(attendance.classId, classId) : undefined,
    subjectId ? eq(attendance.subjectId, subjectId) : undefined,
  ].filter(Boolean)

  const rows = await db
    .select({
      id: attendance.id,
      studentId: attendance.studentId,
      studentName: users.name,
      nis: students.nis,
      classId: attendance.classId,
      className: classes.name,
      subjectId: attendance.subjectId,
      subjectName: subjects.name,
      date: attendance.date,
      status: attendance.status,
      note: attendance.note,
    })
    .from(attendance)
    .leftJoin(students, eq(attendance.studentId, students.id))
    .leftJoin(users, eq(students.userId, users.id))
    .leftJoin(classes, eq(attendance.classId, classes.id))
    .leftJoin(subjects, eq(attendance.subjectId, subjects.id))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(attendance.date), sql`${users.name} asc`)

  const scoped = scopeFilter
    ? rows.filter((r) => (r.subjectId ? scopeFilter!.includes(`${r.classId}|${r.subjectId}`) : false))
    : rows
  const total = scoped.length
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const safePage = Math.min(page, totalPages)
  const paged = scoped.slice((safePage - 1) * perPage, safePage * perPage)

  return { data: paged, summary: buildSummary(scoped), statuses: STATUSES, meta: { page: safePage, perPage, total, totalPages } }
})
