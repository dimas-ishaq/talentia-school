import bcrypt from 'bcrypt'
import { and, count, eq } from 'drizzle-orm'
import { z } from 'zod'
import { users } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireOrganizationAdmin } from '~~/server/utils/tenant'
import { writeAuditLog } from '~~/server/utils/audit'
import { createProfileForRole, deleteProfileForRole } from '~~/server/utils/profile'

const bodySchema = z.object({
  name: z.string().min(2).optional(),
  role: z.enum(['owner', 'org_admin', 'teacher', 'student', 'parent']).optional(),
  email: z.string().email('Email tidak valid').optional(),
  password: z.string().min(8).optional(),
})

export default defineEventHandler(async (event) => {
  const { user: admin, organization } = await requireOrganizationAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID pengguna diperlukan' })

  const target = await db.query.users.findFirst({
    where: and(eq(users.id, id), eq(users.organizationId, organization.id)),
    columns: { id: true, role: true },
  })
  if (!target) throw createError({ statusCode: 404, statusMessage: 'Pengguna tidak ditemukan' })

  const body = bodySchema.parse(await readBody(event))
  if (body.role === 'owner' && admin.role !== 'owner') throw createError({ statusCode: 403, statusMessage: 'Hanya owner yang dapat memberikan role owner' })
  if (target.role === 'owner' && admin.role !== 'owner') throw createError({ statusCode: 403, statusMessage: 'Role owner hanya dapat dikelola owner' })
  if (target.role === 'owner' && body.role !== undefined && body.role !== 'owner') {
    const [ownerCount] = await db
      .select({ count: count() })
      .from(users)
      .where(and(eq(users.organizationId, organization.id), eq(users.role, 'owner')))
    if (ownerCount.count <= 1) throw createError({ statusCode: 400, statusMessage: 'Tidak dapat mengubah role owner terakhir' })
  }

  const updateData: Record<string, unknown> = {}
  if (body.name !== undefined) updateData.name = body.name.trim()
  if (body.role !== undefined) updateData.role = body.role
  if (body.email !== undefined) {
    const email = body.email.trim().toLowerCase()
    const duplicate = await db.query.users.findFirst({ where: eq(users.email, email), columns: { id: true } })
    if (duplicate && duplicate.id !== id) throw createError({ statusCode: 409, statusMessage: 'Email sudah digunakan' })
    updateData.email = email
  }
  if (body.password) updateData.password = await bcrypt.hash(body.password, 10)

  if (Object.keys(updateData).length === 0) throw createError({ statusCode: 400, statusMessage: 'Tidak ada data yang diupdate' })

  const updated = db.transaction((tx) => {
    if (body.role !== undefined && body.role !== target.role) {
      deleteProfileForRole(tx, target.role as never, id)
      createProfileForRole(tx, body.role as never, id)
    }
    const [row] = tx.update(users).set(updateData).where(eq(users.id, id)).returning({ id: users.id, email: users.email, name: users.name, role: users.role }).all()
    return row
  })

  await writeAuditLog({ userId: admin.id, action: 'user.update', target: id, metadata: { ...body, password: body.password ? '***' : undefined, roleChanged: body.role !== undefined && body.role !== target.role } })
  return { success: true, data: updated }
})
