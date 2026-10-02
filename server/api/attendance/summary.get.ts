import { and, eq, gte, lte, or, sql } from 'drizzle-orm'
import { attendance } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { allowedAttendanceScopes } from '~~/server/utils/attendanceAccess'
import { requireOrganization } from '~~/server/utils/tenant'

// GET /api/attendance/summary?classId=&subjectId=&from=&to=
// Rekap jumlah status per siswa sesuai filter aktif (rentang tanggal).
export default defineEventHandler(async (event) => {
  const { user, organization } = await requireOrganization(event)
  if (user.role !== 'admin' && user.role !== 'teacher') throw createError({ statusCode: 403, statusMessage: 'Akses absensi ditolak' })

  const query = getQuery(event)
  const str = (k: string) => (typeof query[k] === 'string' && query[k] ? (query[k] as string) : undefined)
  const classId = str('classId')
  const subjectId = str('subjectId')
  const from = str('from')
  const to = str('to')

  const conditions = [
    eq(attendance.organizationId, organization.id),
    classId ? eq(attendance.classId, classId) : undefined,
    subjectId ? eq(attendance.subjectId, subjectId) : undefined,
    from ? gte(attendance.date, from) : undefined,
    to ? lte(attendance.date, to) : undefined,
  ].filter(Boolean) as any[]

  if (user.role === 'teacher') {
    const scopes = (await allowedAttendanceScopes(event)) ?? []
    if (!scopes.length) return { data: [] }
    const scopeCond = or(...scopes.map((s) => and(eq(attendance.classId, s.classId), eq(attendance.subjectId, s.subjectId))))
    if (scopeCond) conditions.push(scopeCond)
  }

  const rows = await db
    .select({
      studentId: attendance.studentId,
      present: sql<number>`sum(case when ${attendance.status} = 'present' then 1 else 0 end)`,
      late: sql<number>`sum(case when ${attendance.status} = 'late' then 1 else 0 end)`,
      excused: sql<number>`sum(case when ${attendance.status} = 'excused' then 1 else 0 end)`,
      sick: sql<number>`sum(case when ${attendance.status} = 'sick' then 1 else 0 end)`,
      absent: sql<number>`sum(case when ${attendance.status} = 'absent' then 1 else 0 end)`,
      total: sql<number>`count(*)`,
    })
    .from(attendance)
    .where(conditions.length ? and(...conditions) : undefined)
    .groupBy(attendance.studentId)

  return { data: rows }
})
