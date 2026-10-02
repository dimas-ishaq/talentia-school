// server/api/calendar/[id].delete.ts
// DELETE /api/calendar/:id — hapus agenda akademik (admin-only, tenant-scoped).
import { and, eq } from 'drizzle-orm'
import { db } from '~~/server/utils/db'
import { calendarEvents } from '~~/server/database/schema'
import { requireOrganizationAdmin } from '~~/server/utils/tenant'

export default defineEventHandler(async (event) => {
  const { organization } = await requireOrganizationAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID tidak valid' })

  const [deleted] = await db.delete(calendarEvents).where(and(eq(calendarEvents.id, id), eq(calendarEvents.organizationId, organization.id))).returning({ id: calendarEvents.id })

  if (!deleted) {
    throw createError({ statusCode: 404, statusMessage: 'Agenda tidak ditemukan' })
  }

  return { success: true }
})
