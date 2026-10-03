import { and, count, eq } from 'drizzle-orm'
import { users } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireOrganizationAdmin } from '~~/server/utils/tenant'
import { writeAuditLog } from '~~/server/utils/audit'

export default defineEventHandler(async (event) => {
  const { user: admin, organization } = await requireOrganizationAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID pengguna diperlukan' })
  if (id === admin.id) throw createError({ statusCode: 400, statusMessage: 'Tidak dapat menghapus akun sendiri' })

  const target = await db.query.users.findFirst({
    where: and(eq(users.id, id), eq(users.organizationId, organization.id)),
    columns: { id: true, role: true },
  })
  if (!target) throw createError({ statusCode: 404, statusMessage: 'Pengguna tidak ditemukan' })

  if (target.role === 'owner') {
    const [ownerCount] = await db
      .select({ count: count() })
      .from(users)
      .where(and(eq(users.organizationId, organization.id), eq(users.role, 'owner')))
    if (ownerCount.count <= 1) throw createError({ statusCode: 400, statusMessage: 'Tidak dapat menghapus owner terakhir' })
  }

  await db.delete(users).where(and(eq(users.id, id), eq(users.organizationId, organization.id)))
  await writeAuditLog({ userId: admin.id, action: 'user.delete', target: id })
  return { success: true }
})
