import { and, count, eq, like, or } from 'drizzle-orm'
import { organizations } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requirePlatformAdmin } from '~~/server/utils/requireAdmin'
import { countBillableStudents } from '~~/server/utils/billing'

const PAGE_SIZE = 20

export default defineEventHandler(async (event) => {
  await requirePlatformAdmin(event)
  const query = getQuery(event)
  const page = Math.max(1, Number(query.page) || 1)
  const perPage = Math.min(100, Math.max(1, Number(query.perPage) || PAGE_SIZE))
  const offset = (page - 1) * perPage

  const search = String(query.search || '').trim()
  const status = String(query.status || '').trim()
  const conditions = []
  if (search.length >= 2) {
    conditions.push(or(like(organizations.name, `%${search}%`), like(organizations.slug, `%${search}%`)))
  }
  if (['trial', 'active', 'past_due', 'suspended', 'cancelled'].includes(status)) {
    conditions.push(eq(organizations.status, status as never))
  }
  const where = conditions.length ? and(...conditions) : undefined

  const [rows, totalResult] = await Promise.all([
    db.select({ id: organizations.id, name: organizations.name, slug: organizations.slug, status: organizations.status, createdAt: organizations.createdAt })
      .from(organizations).where(where).limit(perPage).offset(offset),
    db.select({ value: count() }).from(organizations).where(where),
  ])
  const total = totalResult[0]?.value ?? 0
  const data = await Promise.all(rows.map(async (row) => ({
    ...row,
    billableStudents: await countBillableStudents(row.id),
  })))
  return { data, meta: { page, perPage, total, totalPages: Math.ceil(total / perPage) } }
})
