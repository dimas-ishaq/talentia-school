// server/api/schedules/[id].delete.ts
// DELETE /api/schedules/:id — hapus 1 jadwal (admin-only).
import { eq } from 'drizzle-orm'
import { db } from '~~/server/utils/db'
import { scheduleEntries } from '~~/server/database/schema'
import { requireAdmin } from '~~/server/utils/requireAdmin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID tidak valid' })

  const [deleted] = await db
    .delete(scheduleEntries)
    .where(eq(scheduleEntries.id, id))
    .returning({ id: scheduleEntries.id })

  if (!deleted) {
    throw createError({ statusCode: 404, statusMessage: 'Jadwal tidak ditemukan' })
  }

  return { success: true }
})
