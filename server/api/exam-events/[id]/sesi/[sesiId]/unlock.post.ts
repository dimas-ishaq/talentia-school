// POST /api/exam-events/[id]/sesi/[sesiId]/unlock — unlock attempt oleh proktor/admin (tanpa token)
import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { examSessions, quizAttempts, quizEvents } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireExamManager } from '~~/server/utils/exam'

const schema = z.object({ attemptId: z.string().uuid() })

export default defineEventHandler(async (event) => {
  const eventId = String(getRouterParam(event, 'id') ?? '')
  const sesiId = String(getRouterParam(event, 'sesiId') ?? '')
  await requireExamManager(event, eventId)
  const { user } = await requireUserSession(event)
  if (!['admin', 'teacher'].includes(user.role)) throw createError({ statusCode: 403, statusMessage: 'Admin/guru saja' })

  const body = schema.parse(await readBody(event))
  const session = await db.query.examSessions.findFirst({
    where: and(eq(examSessions.id, sesiId), eq(examSessions.eventId, eventId)),
    columns: { id: true },
  })
  if (!session) throw createError({ statusCode: 404, statusMessage: 'Sesi tidak ditemukan' })
  const attempt = await db.query.quizAttempts.findFirst({
    where: and(eq(quizAttempts.id, body.attemptId), eq(quizAttempts.sessionId, session.id)),
  })
  if (!attempt) throw createError({ statusCode: 404, statusMessage: 'Percobaan tidak ditemukan' })
  if (attempt.lockStatus !== 'locked') throw createError({ statusCode: 400, statusMessage: 'Percobaan tidak dalam kondisi terkunci' })

  await db.update(quizAttempts).set({
    lockStatus: 'ok',
    unlockedBy: user.id,
    lastUnlockedAt: new Date(),
    lastUnlockMethod: 'direct',
  }).where(eq(quizAttempts.id, attempt.id))

  await db.insert(quizEvents).values({
    id: crypto.randomUUID(), attemptId: attempt.id, activityId: attempt.activityId,
    studentId: attempt.studentId, userId: user.id, type: 'unlock', detail: 'direct (proktor/admin)',
  })

  return { success: true }
})
