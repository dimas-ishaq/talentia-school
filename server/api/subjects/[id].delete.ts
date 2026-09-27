// server/api/subjects/[id].delete.ts
// DELETE /api/subjects/:id — hapus 1 mapel.
// Beda dengan classes: mapel belum dipakai tabel lain,
// jadi hapus langsung tanpa cek relasi.
import { db } from '~~/server/utils/db'
import { subjects } from '~~/server/database/schema'
import { eq } from 'drizzle-orm'
import { requireAdmin } from '~~/server/utils/requireAdmin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID tidak valid' })

  const [deleted] = await db
    .delete(subjects)
    .where(eq(subjects.id, id))
    .returning({ id: subjects.id })

  if (!deleted) {
    throw createError({ statusCode: 404, statusMessage: 'Mata pelajaran tidak ditemukan' })
  }

  return { success: true }
})
