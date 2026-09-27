// GET /api/exam-events — daftar event (admin: semua, guru: yang diampu)
import { eq, desc, and } from 'drizzle-orm'
import { examEvents } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const q = getQuery(event)
  const status = q.status as string | undefined
  const type = q.type as string | undefined

  const conditions = []
  if (status) conditions.push(eq(examEvents.status, status as any))
  if (type) conditions.push(eq(examEvents.type, type as any))

  const rows = await db.query.examEvents.findMany({
    where: conditions.length ? and(...conditions) : undefined,
    orderBy: [desc(examEvents.createdAt)],
    with: {
      subjects: { with: { subject: true } },
      classes: { with: { class: true } },
    },
  })

  return { data: rows }
})