// POST /api/exam-events/[id]/sesi — buat blok sesi (admin)
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { examSesi } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireExamManager } from '~~/server/utils/exam'

const schema = z.object({
  name: z.string().trim().min(1).max(50), // "Sesi 1", "Sesi 2"
  openAt: z.string().trim().min(1),       // ISO or date-time string
  closeAt: z.string().trim().min(1),
  position: z.number().int().optional().default(0),
})

export default defineEventHandler(async (event) => {
  const eventId = String(getRouterParam(event, 'id') ?? '')
  await requireExamManager(event, eventId)
  const { user } = await requireUserSession(event)
  if (user.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Hanya admin yang mengelola sesi' })
  const body = schema.parse(await readBody(event))

  // Auto-position: find highest +1
  let maxPos = 0
  const existing = await db.query.examSesi.findMany({ where: eq(examSesi.eventId, eventId) })
  if (existing.length) maxPos = Math.max(...existing.map((s) => s.position ?? 0))

  const id = crypto.randomUUID()
  await db.insert(examSesi).values({
    id,
    eventId,
    name: body.name,
    openAt: body.openAt,
    closeAt: body.closeAt,
    position: body.position ?? maxPos + 1,
    status: 'draft',
    createdBy: user.id,
  })

  return { data: { id, name: body.name, position: body.position ?? maxPos + 1 } }
})
