// server/api/schedules/[id].delete.ts
// DELETE /api/schedules/:id — hapus 1 jadwal (admin-only).
import { and, eq } from 'drizzle-orm'
import { db } from '~~/server/utils/db'
import { scheduleEntries } from '~~/server/database/schema'
import { requireOrganizationAdmin } from '~~/server/utils/tenant'

export default defineEventHandler(async (event) => {
  const { organization } = await requireOrganizationAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID tidak valid' })

  const [deleted] = await db
    .delete(scheduleEntries)
    .where(and(eq(scheduleEntries.id, id), eq(scheduleEntries.organizationId, organization.id)))
    .returning({ id: scheduleEntries.id })

  if (!deleted) {
    throw createError({ statusCode: 404, statusMessage: 'Jadwal tidak ditemukan' })
  }

  return { success: true }
})
