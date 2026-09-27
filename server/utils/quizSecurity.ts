import { and, eq } from 'drizzle-orm'
import { quizAttempts, quizEvents } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

// ponytail: in-memory limiter fits single-process deployment; move counters to DB/Redis for multi-instance.
const buckets = new Map<string, { count: number; resetAt: number }>()

export function enforceQuizRateLimit(key: string, limit = 30, windowMs = 60_000) {
  const now = Date.now()
  const current = buckets.get(key)
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return
  }
  if (current.count >= limit) {
    throw createError({ statusCode: 429, statusMessage: 'Terlalu banyak request quiz. Coba lagi nanti.' })
  }
  current.count++
}

export async function logQuizEvent(input: {
  attemptId: string
  type: 'tab_switch' | 'copy' | 'paste' | 'cut' | 'context_menu' | 'focus_lost' | 'start' | 'submit' | 'auto_submit'
  detail?: string
}) {
  const attempt = await db.query.quizAttempts.findFirst({ where: eq(quizAttempts.id, input.attemptId) })
  if (!attempt) return
  await db.insert(quizEvents).values({
    id: crypto.randomUUID(),
    attemptId: attempt.id,
    activityId: attempt.activityId,
    studentId: attempt.studentId,
    type: input.type,
    detail: input.detail?.slice(0, 500) ?? null,
  })
}

export async function requireAttemptOwner(attemptId: string, activityId: string, studentId: string) {
  const attempt = await db.query.quizAttempts.findFirst({
    where: and(eq(quizAttempts.id, attemptId), eq(quizAttempts.activityId, activityId), eq(quizAttempts.studentId, studentId)),
  })
  if (!attempt) throw createError({ statusCode: 404, statusMessage: 'Percobaan tidak ditemukan' })
  return attempt
}
