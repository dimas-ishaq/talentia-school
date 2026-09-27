// GET /api/classes/:id/students?page=1&perPage=50&q=andi
import { db } from '~~/server/utils/db'
import { students, users } from '~~/server/database/schema'
import { normalizePerPage } from '~~/server/utils/pagination'
import { eq, asc, count, and, or, like } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const classId = getRouterParam(event, 'id')
  if (!classId) throw createError({ statusCode: 400, statusMessage: 'ID kelas diperlukan' })

  const query = getQuery(event)
  const page = Math.max(1, Number(query.page) || 1)
  const perPage = normalizePerPage(query.perPage)
  const q = typeof query.q === 'string' ? query.q.trim() : ''

  const whereClause = q
    ? and(eq(students.classId, classId), or(like(users.name, `%${q}%`), like(students.nis, `%${q}%`)))
    : eq(students.classId, classId)

  const totalRow = (await db
    .select({ total: count() })
    .from(students)
    .leftJoin(users, eq(students.userId, users.id))
    .where(whereClause))[0]
  const total = totalRow?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const safePage = Math.min(page, totalPages)

  const rows = await db
    .select({ id: students.id, nis: students.nis, gender: students.gender, classId: students.classId, name: users.name })
    .from(students)
    .leftJoin(users, eq(students.userId, users.id))
    .where(whereClause)
    .orderBy(asc(users.name))
    .limit(perPage)
    .offset((safePage - 1) * perPage)

  return { success: true, data: rows, meta: { page: safePage, perPage, total, totalPages } }
})
