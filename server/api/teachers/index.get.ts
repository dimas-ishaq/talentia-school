// server/api/teachers/index.get.ts
import { db } from '~~/server/utils/db'
import { teachers, users, classes } from '~~/server/database/schema'
import { eq, asc, sql, like, or, and } from 'drizzle-orm'
import { requireOrganization } from '~~/server/utils/tenant'

export default defineEventHandler(async (event) => {
  const { organization } = await requireOrganization(event)
  const query = getQuery(event)
  const q = (query.q as string)?.trim().toLowerCase() || ''
  const status = (query.status as string) || 'all'

  // === Kondisi filter ===
  const conditions: any[] = [eq(teachers.organizationId, organization.id)]

  // Filter status
  if (status === 'active') conditions.push(eq(teachers.isActive, true))
  else if (status === 'inactive') conditions.push(eq(teachers.isActive, false))

  // Filter pencarian (nama, kode, nip, mapel, email)
  if (q) {
    const searchCond = or(
      like(users.name, `%${q}%`),
      like(teachers.code, `%${q}%`),
      like(teachers.nip, `%${q}%`),
      like(teachers.subject, `%${q}%`),
      like(users.email, `%${q}%`),
    )
    if (searchCond) conditions.push(searchCond)
  }

  const whereClause = and(...conditions)

  const rows = await db
    .select({
      id: teachers.id,
      name: users.name,
      code: teachers.code,
      nip: teachers.nip,
      phone: teachers.phone,
      address: teachers.address,
      subject: teachers.subject,
      email: users.email,
      isActive: teachers.isActive,
      classCount: sql<number>`(
        SELECT COUNT(*) FROM ${classes}
        WHERE ${classes.teacherId} = ${teachers.id}
      )`.as('class_count'),
    })
    .from(teachers)
    .leftJoin(users, eq(teachers.userId, users.id))
    .where(whereClause)
    .orderBy(asc(users.name))

  return { data: rows }
})