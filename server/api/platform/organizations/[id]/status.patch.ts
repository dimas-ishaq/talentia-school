import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { organizations } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requirePlatformAdmin } from '~~/server/utils/requireAdmin'
import { writeAuditLog } from '~~/server/utils/audit'

// Status yang boleh dioperator. 'trial'/'past_due'置 oleh sistem, bukan operator.
const schema = z.object({ status: z.enum(['active', 'suspended', 'cancelled']) })

export default defineEventHandler(async (event) => {
  const operator = await requirePlatformAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID organisasi diperlukan' })
  const body = schema.parse(await readBody(event))

  const current = await db.query.organizations.findFirst({ where: eq(organizations.id, id), columns: { id: true, status: true } })
  if (!current) throw createError({ statusCode: 404, statusMessage: 'Organisasi tidak ditemukan' })
  if (current.status === body.status) throw createError({ statusCode: 400, statusMessage: 'Status sudah sama' })

  await db.update(organizations).set({ status: body.status }).where(eq(organizations.id, id))
  await writeAuditLog({
    userId: operator.id,
    action: 'organization.status_change',
    target: id,
    metadata: { from: current.status, to: body.status },
  })
  return { success: true, data: { id, status: body.status } }
})