import { eq, and } from 'drizzle-orm'
import bcrypt from 'bcrypt'
import { randomBytes } from 'node:crypto'
import { users } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireOrganizationAdmin } from '~~/server/utils/tenant'
import { writeAuditLog } from '~~/server/utils/audit'

export default defineEventHandler(async (event) => {
  const { user: admin, organization } = await requireOrganizationAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID pengguna diperlukan' })

  const target = await db.query.users.findFirst({
    where: and(eq(users.id, id), eq(users.organizationId, organization.id)),
    columns: { id: true },
  })
  if (!target) throw createError({ statusCode: 404, statusMessage: 'Pengguna tidak ditemukan' })

  const temporaryPassword = randomBytes(6).toString('base64url').slice(0, 10)
  await (db as any).update(users).set({ password: await bcrypt.hash(temporaryPassword, 10), mustChangePassword: true }).where(eq(users.id, id))
  await writeAuditLog({ userId: admin.id, action: 'user.reset_password', target: id })
  return { success: true, temporaryPassword }
})
