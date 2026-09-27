import { users } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { asc, count, eq, and, like, or, type SQL } from 'drizzle-orm'
import { requireOrganizationAdmin } from '~~/server/utils/tenant'

const ROLES = ['admin', 'owner', 'org_admin', 'teacher', 'student', 'parent'] as const
type Role = typeof ROLES[number]

export default defineEventHandler(async (event) => {
  const { organization } = await requireOrganizationAdmin(event)
  const query = getQuery(event)
  const page = Math.max(1, Number(query.page) || 1)
  const perPage = Math.min(100, Math.max(1, Number(query.perPage) || 10))
  const offset = (page - 1) * perPage
  const conditions: SQL[] = [eq(users.organizationId, organization.id)]

  const role = String(query.role || '') as Role
  if (ROLES.includes(role)) conditions.push(eq(users.role, role))

  const search = String(query.search || '').trim()
  if (search.length >= 3) {
    const searchCondition = or(like(users.name, `%${search}%`), like(users.email, `%${search}%`))
    if (searchCondition) conditions.push(searchCondition)
  }

  const whereClause = and(...conditions)
  const [rows, totalResult] = await Promise.all([
    db.select({ id: users.id, email: users.email, name: users.name, role: users.role, createdAt: users.createdAt })
      .from(users).where(whereClause).orderBy(asc(users.name)).limit(perPage).offset(offset),
    db.select({ value: count() }).from(users).where(whereClause),
  ])
  const total = totalResult[0]?.value ?? 0
  return { data: rows, meta: { page, perPage, total, totalPages: Math.ceil(total / perPage) } }
})
