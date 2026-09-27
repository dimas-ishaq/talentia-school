// server/api/students/index.get.ts
import { db } from '~~/server/utils/db'
import { students, users, classes } from '~~/server/database/schema'
import { eq, asc, count, and, like, or } from 'drizzle-orm'
import { requireOrganizationAdmin } from '~~/server/utils/tenant'

export default defineEventHandler(async (event) => {
  const { organization } = await requireOrganizationAdmin(event)
  const query = getQuery(event)
  const page = Math.max(1, Number(query.page) || 1)
  const perPage = Math.min(100, Math.max(1, Number(query.perPage) || 10))

  // Build dynamic WHERE
  const conditions: any[] = [eq(students.organizationId, organization.id)]

  // Status filter
  if (query.status === 'active') conditions.push(eq(students.isActive, true))
  else if (query.status === 'inactive') conditions.push(eq(students.isActive, false))

  // Search by name or NIS
  const search = String(query.search || '').trim()
  if (search) {
    conditions.push(
      or(
        like(users.name, `%${search}%`),
        like(students.nis, `%${search}%`),
      )
    )
  }

  // Filter by class
  if (query.classId) conditions.push(eq(students.classId, String(query.classId)))

  // Filter by gender
  if (query.gender === 'L' || query.gender === 'P') conditions.push(eq(students.gender, query.gender))

  const whereClause = conditions.length ? and(...conditions) : undefined
  const offset = (page - 1) * perPage

  const [rows, totalResult] = await Promise.all([
    db
      .select({
        id: students.id,
        nis: students.nis,
        gender: students.gender,
        classId: students.classId,
        className: classes.name,
        name: users.name,
        isActive: students.isActive,
      })
      .from(students)
      .leftJoin(users, eq(students.userId, users.id))
      .leftJoin(classes, eq(students.classId, classes.id))
      .where(whereClause)
      .orderBy(asc(users.name))
      .limit(perPage)
      .offset(offset),
    db.select({ value: count() }).from(students).leftJoin(users, eq(students.userId, users.id)).where(whereClause),
  ])

  const total = totalResult[0]?.value ?? 0

  return {
    data: rows,
    meta: { page, perPage, total, totalPages: Math.ceil(total / perPage) },
  }
})