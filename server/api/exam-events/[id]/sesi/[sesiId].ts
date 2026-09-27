// PATCH /api/exam-events/[id]/sesi/[id] — edit sesi (admin)
// DELETE /api/exam-events/[id]/sesi/[id] — hapus sesi (admin, jika masih draft)
import { eq } from 'drizzle-orm'
import { examSesi, examSessions } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { z } from 'zod'
import { requireExamSesiManager } from '~~/server/utils/exam'

const schema = z.object({
  name: z.string().trim().min(1).max(50).optional(),
  openAt: z.string().trim().optional(),
  closeAt: z.string().trim().optional(),
  position: z.number().int().optional(),
})

export default defineEventHandler(async (event) => {
  const sesiId = String(getRouterParam(event, 'sesiId') ?? '')
  await requireExamSesiManager(event, sesiId)
  const method = getMethod(event)

  const sesi = await db.query.examSesi.findFirst({ where: eq(examSesi.id, sesiId) })
  if (!sesi) throw createError({ statusCode: 404, statusMessage: 'Sesi tidak ditemukan' })

  if (method === 'DELETE') {
    if (sesi.status !== 'draft') throw createError({ statusCode: 400, statusMessage: 'Hanya sesi berstatus draft yang dapat dihapus' })
    await db.delete(examSessions).where(eq(examSessions.sesiId, sesiId)) // cascade will remove sessions
    await db.delete(examSesi).where(eq(examSesi.id, sesiId))
    return { success: true }
  }

  if (method === 'PATCH') {
    const changes = schema.parse(await readBody(event))
    if (changes.openAt && changes.closeAt && new Date(changes.openAt) >= new Date(changes.closeAt)) {
      throw createError({ statusCode: 400, statusMessage: 'openAt harus sebelum closeAt' })
    }
    await db.update(examSesi).set(changes).where(eq(examSesi.id, sesiId))
    return { success: true }
  }
})
