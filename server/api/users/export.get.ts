import { users } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { asc, eq } from 'drizzle-orm'
import { requireOrganizationAdmin } from '~~/server/utils/tenant'

export default defineEventHandler(async (event) => {
  const { organization } = await requireOrganizationAdmin(event)
  const allUsers = await db
    .select({ id: users.id, email: users.email, name: users.name, role: users.role, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.organizationId, organization.id))
    .orderBy(asc(users.name))

  const escapeCsv = (v: string | null | undefined) => `"${(v ?? '').replace(/"/g, '""')}"`
  const header = 'ID,Email,Nama,Role,Tanggal Dibuat'
  const rows = allUsers.map((u) => [u.id, escapeCsv(u.email), escapeCsv(u.name), u.role, u.createdAt].join(','))
  const csv = [header, ...rows].join('\n')

  setResponseHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
  setResponseHeader(event, 'Content-Disposition', 'attachment; filename="users.csv"')
  return csv
})