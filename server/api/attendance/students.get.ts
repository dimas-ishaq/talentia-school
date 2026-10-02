// GET /api/attendance/students?q=&classId=&page=1&perPage=50
// Daftar siswa yang boleh diakses user untuk keperluan absensi.
// - Admin : semua siswa (pencarian global lintas kelas).
// - Guru  : hanya siswa di kelas yang diampu.
import { and, asc, count, eq, inArray, like, or } from 'drizzle-orm'
import { students, users, classes } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { normalizePerPage } from '~~/server/utils/pagination'
import { allowedAttendanceScopes } from '~~/server/utils/attendanceAccess'
import { requireOrganization } from '~~/server/utils/tenant'

export default defineEventHandler(async (event) => {
  const { user, organization } = await requireOrganization(event)
  if (user.role !== 'admin' && user.role !== 'teacher') throw createError({ statusCode: 403, statusMessage: 'Akses absensi ditolak' })

  const query = getQuery(event)
  const page = Math.max(1, Number(query.page) || 1)
  const perPage = normalizePerPage(query.perPage)
  const q = typeof query.q === 'string' ? query.q.trim() : ''
  const classId = typeof query.classId === 'string' && query.classId ? query.classId : undefined

  const conditions: any[] = [eq(students.organizationId, organization.id)]
  if (classId) conditions.push(eq(students.classId, classId))
  if (q) conditions.push(or(like(users.name, `%${q}%`), like(students.nis, `%${q}%`)))

  if (user.role === 'teacher') {
    const scopes = (await allowedAttendanceScopes(event)) ?? []
    const classIds = [...new Set(scopes.map((s) => s.classId))]
    if (!classIds.length) return { data: [], meta: { page: 1, perPage, total: 0, totalPages: 1 } }
    conditions.push(inArray(students.classId, classIds))
  }

  const where = conditions.length ? and(...conditions) : undefined
  const totalRow = (await db
    .select({ total: count() })
    .from(students)
    .leftJoin(users, eq(students.userId, users.id))
    .where(where))[0]
  const total = totalRow?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const safePage = Math.min(page, totalPages)

  const rows = await db
    .select({ id: students.id, name: users.name, nis: students.nis, classId: students.classId, className: classes.name })
    .from(students)
    .leftJoin(users, eq(students.userId, users.id))
    .leftJoin(classes, eq(students.classId, classes.id))
    .where(where)
    .orderBy(asc(classes.name), asc(users.name))
    .limit(perPage)
    .offset((safePage - 1) * perPage)

  return { data: rows, meta: { page: safePage, perPage, total, totalPages } }
})
