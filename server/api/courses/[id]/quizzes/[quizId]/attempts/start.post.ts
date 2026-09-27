import { eq, and, asc } from 'drizzle-orm'
import bcrypt from 'bcrypt'
import { z } from 'zod'
import { quizAttempts } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireQuizActivity, requireEnrolledStudent, finalizeAttempt } from '~~/server/utils/quiz'
import { enforceQuizRateLimit, logQuizEvent } from '~~/server/utils/quizSecurity'

export default defineEventHandler(async (event) => {
  const courseId = getRouterParam(event, 'id')!
  const quizId = getRouterParam(event, 'quizId')!
  const { user } = await requireUserSession(event)
  if (user.role !== 'student') throw createError({ statusCode: 403, statusMessage: 'Hanya siswa' })

  const activity = await requireQuizActivity(event, courseId, quizId)
  const student = await requireEnrolledStudent(user.id, courseId)
  const body = z.object({ password: z.string().max(200).optional() }).parse(await readBody(event).catch(() => ({})))
  enforceQuizRateLimit(`quiz-start:${student.id}:${quizId}`, 15, 60_000)

  if (activity.quizPassword && (!body.password || !(await bcrypt.compare(body.password, activity.quizPassword)))) {
    throw createError({ statusCode: 401, statusMessage: 'Kata sandi quiz salah' })
  }

  // Published gate
  if (activity.status === 'draft') throw createError({ statusCode: 400, statusMessage: 'Quiz belum dipublikasikan' })

  // Open/close window
  const now = Date.now()
  if (activity.openAt) {
    const open = new Date(activity.openAt).getTime()
    if (now < open) throw createError({ statusCode: 400, statusMessage: 'Quiz belum dibuka' })
  }
  if (activity.closeAt) {
    const close = new Date(activity.closeAt).getTime()
    if (now > close) throw createError({ statusCode: 400, statusMessage: 'Quiz sudah ditutup' })
  }

  // Count completed attempts (submitted + auto_submitted + abandoned)
  const completedAttempts = await db.select().from(quizAttempts).where(
    and(
      eq(quizAttempts.activityId, quizId),
      eq(quizAttempts.studentId, student.id),
    ),
  )
  const completed = completedAttempts.filter((a) => ['submitted', 'auto_submitted', 'abandoned', 'needs_grading'].includes(a.status))

  if (activity.maxAttempts != null && activity.maxAttempts > 0 && completed.length >= activity.maxAttempts) {
    throw createError({ statusCode: 400, statusMessage: `Batas percobaan tercapai (${activity.maxAttempts})` })
  }

  // Resume in-progress attempt
  const inProgress = completedAttempts.find((a) => a.status === 'in_progress')
  if (inProgress) {
    // Check duration expiry
    if (activity.durationMinutes && activity.durationMinutes > 0) {
      const elapsed = now - inProgress.startedAt.getTime()
      const maxMs = activity.durationMinutes * 60 * 1000
      if (elapsed > maxMs) {
        // Waktu habis → kunci jawaban yang ada sebagai auto_submitted
        await finalizeAttempt(inProgress.id, { auto: true })
        throw createError({ statusCode: 400, statusMessage: 'Waktu habis, percobaan sebelumnya ditutup otomatis' })
      }
    }
    return { data: { attemptId: inProgress.id, started: true } }
  }

  // Create new attempt
  const attemptId = crypto.randomUUID()
  await db.insert(quizAttempts).values({
    id: attemptId,
    activityId: quizId,
    studentId: student.id,
    attemptNumber: completed.length + 1,
    startedAt: new Date(),
    status: 'in_progress',
  })
  await logQuizEvent({ attemptId, type: 'start' })

  return { data: { attemptId, started: true } }
})
