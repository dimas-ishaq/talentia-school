// GET /api/exam-events/[id]/sesi — daftar sesi per event
import { eq, asc } from 'drizzle-orm'
import { examSesi } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

export default defineEventHandler(async (event) => {
  const eventId = String(getRouterParam(event, 'id') ?? '')
  await requireUserSession(event)
  
  const rows = await db.query.examSesi.findMany({
    where: eq(examSesi.eventId, eventId),
    orderBy: [asc(examSesi.position)],
    with: {
      sessions: { columns: { id: true, openAt: true, closeAt: true, status: true }, with: { class: true } },
      subjects: { columns: { id: true, subjectId: true, activityId: true } },
    },
  })
  return { data: rows }
})
