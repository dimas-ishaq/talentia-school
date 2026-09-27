// GET /api/exam-events/[id] — detail event (dengan subjects, classes, sessions per-class)
// PATCH — edit event (admin)
// DELETE — hapus event (draft saja, admin)
import { eq } from 'drizzle-orm'
import { examEvents } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { z } from 'zod'

const patchSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  type: z.enum(['ASTS', 'ASAS', 'PAS', 'PAT', 'TRYOUT', 'SCHOOL_EXAM']).optional(),
  academicYear: z.string().trim().min(1).max(20).optional(),
  semester: z.enum(['ganjil', 'genap']).optional(),
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
  description: z.string().trim().max(5000).optional(),
  status: z.enum(['draft', 'published', 'closed']).optional(),
})

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const id = String(getRouterParam(event, 'id') ?? '')
  const record = await db.query.examEvents.findFirst({ where: eq(examEvents.id, id) })
  if (!record) throw createError({ statusCode: 404, statusMessage: 'Event tidak ditemukan' })

  // GET
  if (event.method === 'GET') {
    const data = await db.query.examEvents.findFirst({
      where: eq(examEvents.id, id),
      with: {
        subjects: { with: { subject: true, examCourse: true, activity: true, subjectClasses: { with: { class: true } } } },
        classes: { with: { class: true } },
        sessions: { with: { class: true, eventSubject: { with: { subject: true } } } },
        sesi: true,
      },
    })
    return { data }
  }

  // PATCH / DELETE — admin only
  if (!['admin'].includes(user.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Hanya admin' })
  }

  if (event.method === 'PATCH') {
    const changes = patchSchema.parse(await readBody(event))
    const startDate = changes.startDate ?? record.startDate
    const endDate = changes.endDate ?? record.endDate
    if (endDate < startDate) {
      throw createError({ statusCode: 400, statusMessage: 'Tanggal selesai harus setelah tanggal mulai' })
    }
    if (changes.academicYear && !/^\d{4}\/\d{4}$/.test(changes.academicYear)) {
      throw createError({ statusCode: 400, statusMessage: 'Tahun ajaran harus berformat YYYY/YYYY' })
    }
    await db.update(examEvents).set(changes as any).where(eq(examEvents.id, id))
    return { success: true }
  }

  if (event.method === 'DELETE') {
    if (record.status !== 'draft') {
      throw createError({ statusCode: 400, statusMessage: 'Hanya event berstatus draft yang dapat dihapus' })
    }
    await db.delete(examEvents).where(eq(examEvents.id, id))
    return { success: true }
  }
})