// server/api/calendar/[id].delete.ts
// DELETE /api/calendar/:id — hapus agenda akademik (admin-only).
import { eq } from 'drizzle-orm'
import { db } from '~~/server/utils/db'
import { calendarEvents } from '~~/server/database/schema'
import { requireAdmin } from '~~/server/utils/requireAdmin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID tidak valid' })

  const [deleted] = await db.delete(calendarEvents).where(eq(calendarEvents.id, id)).returning({ id: calendarEvents.id })

  if (!deleted) {
    throw createError({ statusCode: 404, statusMessage: 'Agenda tidak ditemukan' })
  }

  return { success: true }
})
