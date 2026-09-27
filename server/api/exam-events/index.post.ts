// POST /api/exam-events — buat event baru
import { z } from 'zod'
import { examEvents } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

const schema = z.object({
  name: z.string().trim().min(1).max(200),
  type: z.enum(['ASTS', 'ASAS', 'PAS', 'PAT', 'TRYOUT', 'SCHOOL_EXAM']),
  academicYear: z.string().trim().min(1).max(20),
  semester: z.enum(['ganjil', 'genap']),
  startDate: z.string().trim().min(1),
  endDate: z.string().trim().min(1),
  description: z.string().trim().max(5000).optional().default(''),
})

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  if (user.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Hanya admin' })

  const body = schema.parse(await readBody(event))
  if (body.endDate < body.startDate) {
    throw createError({ statusCode: 400, statusMessage: 'Tanggal selesai harus setelah tanggal mulai' })
  }
  if (!/^\d{4}\/\d{4}$/.test(body.academicYear)) {
    throw createError({ statusCode: 400, statusMessage: 'Tahun ajaran harus berformat YYYY/YYYY' })
  }

  const id = crypto.randomUUID()
  await db.insert(examEvents).values({
    id,
    ...body,
    description: body.description || null,
    status: 'draft',
    createdBy: user.id,
  })

  return { data: { id } }
})