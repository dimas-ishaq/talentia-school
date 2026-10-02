import { and, eq, count } from 'drizzle-orm'
import { quizAttempts, quizQuestions, quizAttemptAnswers, quizEvents } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireQuizActivity, requireEnrolledStudent, canStudentSeeScore } from '~~/server/utils/quiz'
import { enforceQuizRateLimit } from '~~/server/utils/quizSecurity'
import { requireOrganization } from '~~/server/utils/tenant'

/** Meta info sebelum mulai: jumlah soal, durasi, aturan, dll. tanpa membocorkan soal. */
export default defineEventHandler(async (event) => {
  const courseId = getRouterParam(event, 'id')!
  const quizId = getRouterParam(event, 'quizId')!
  const { user, organization } = await requireOrganization(event)
  if (user.role !== 'student') throw createError({ statusCode: 403, statusMessage: 'Hanya siswa' })

  const activity = await requireQuizActivity(event, courseId, quizId)
  const student = await requireEnrolledStudent(user.id, courseId)
  if (student.organizationId !== organization.id) throw createError({ statusCode: 403, statusMessage: 'Akses ditolak' })
  enforceQuizRateLimit(`quiz-info:${student.id}:${quizId}`, 20, 60_000)

  if (activity.status === 'draft') throw createError({ statusCode: 400, statusMessage: 'Quiz belum dipublikasikan' })
  const now = Date.now()
  if (activity.openAt && now < new Date(activity.openAt).getTime()) throw createError({ statusCode: 400, statusMessage: 'Quiz belum dibuka' })

  const [{ total: questionCount } = { total: 0 }] = await db.select({ total: count() }).from(quizQuestions).where(eq(quizQuestions.activityId, quizId))
  const attempts = await db.select().from(quizAttempts).where(and(eq(quizAttempts.activityId, quizId), eq(quizAttempts.studentId, student.id)))

  // Quiz sudah ditutup: siswa yang belum pernah mengerjakan tidak boleh membuka.
  // Siswa yang sudah punya percobaan tetap boleh melihat hasil/detail ujiannya.
  const quizClosed = !!activity.closeAt && now > new Date(activity.closeAt).getTime()
  if (quizClosed && attempts.length === 0) throw createError({ statusCode: 400, statusMessage: 'Quiz sudah ditutup' })

  const completed = attempts.filter((a) => ['submitted', 'auto_submitted', 'abandoned', 'needs_grading'].includes(a.status))
  const inProgress = attempts.find((a) => a.status === 'in_progress')
  const attemptLimit = activity.maxAttempts && activity.maxAttempts > 0 ? activity.maxAttempts : null
  const attemptsLeft = attemptLimit == null ? null : Math.max(0, attemptLimit - completed.length)

  // Durasi tersisa bila melanjutkan percobaan yang belum selesai
  let remainingMs: number | null = null
  if (inProgress && activity.durationMinutes && activity.durationMinutes > 0) {
    remainingMs = Math.max(0, inProgress.startedAt.getTime() + activity.durationMinutes * 60000 - now)
  }

  const [latestAttempt] = attempts.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
  let latestAttemptDetail: any = null

  if (latestAttempt && latestAttempt.status !== 'in_progress') {
    const questionRows = await db.select().from(quizQuestions).where(eq(quizQuestions.activityId, quizId))
    const [answers, events] = await Promise.all([
      db.select().from(quizAttemptAnswers).where(eq(quizAttemptAnswers.attemptId, latestAttempt.id)),
      db.select().from(quizEvents).where(eq(quizEvents.attemptId, latestAttempt.id)),
    ])
    const answeredCount = answers.filter((a) => a.selectedOptionId || a.answerText).length
    const flaggedCount = events.filter((e) => e.type === 'copy' || e.type === 'paste' || e.type === 'cut' || e.type === 'context_menu' || e.type === 'tab_switch' || e.type === 'focus_lost').length
    const canShowScore = canStudentSeeScore(activity)
    const durationSeconds = latestAttempt.submittedAt ? Math.floor((latestAttempt.submittedAt.getTime() - latestAttempt.startedAt.getTime()) / 1000) : null

    latestAttemptDetail = {
      id: latestAttempt.id,
      attemptNumber: latestAttempt.attemptNumber,
      status: latestAttempt.status,
      score: canShowScore ? latestAttempt.score : null,
      startedAt: latestAttempt.startedAt,
      submittedAt: latestAttempt.submittedAt,
      autoSubmitted: latestAttempt.autoSubmitted,
      totalQuestions: questionRows.length,
      answeredCount,
      unansweredCount: Math.max(0, questionRows.length - answeredCount),
      flaggedCount,
      durationSeconds,
      violationCount: latestAttempt.violationCount,
      violations: {
        tabSwitch: events.filter((e) => e.type === 'tab_switch').length,
        focusLost: events.filter((e) => e.type === 'focus_lost').length,
        copy: events.filter((e) => e.type === 'copy').length,
        paste: events.filter((e) => e.type === 'paste').length,
        cut: events.filter((e) => e.type === 'cut').length,
        contextMenu: events.filter((e) => e.type === 'context_menu').length,
        total: flaggedCount,
      },
    }
  }

  return {
    data: {
      title: activity.title,
      content: activity.content,
      instructions: activity.quizInstructions,
      questionCount,
      maxPoint: activity.maxPoint ?? 100,
      hasPassword: !!activity.quizPassword,
      durationMinutes: activity.durationMinutes,
      remainingMs,
      maxAttempts: attemptLimit,
      attemptsUsed: completed.length,
      attemptsLeft,
      hasActiveAttempt: !!inProgress,
      openAt: activity.openAt,
      closeAt: activity.closeAt,
      examMode: activity.examMode,
      fullscreenMode: activity.fullscreenMode,
      scoreVisibility: activity.scoreVisibility ?? 'immediate',
      reviewMode: activity.reviewMode ?? 'immediate',
      latestAttempt: latestAttemptDetail,
    },
  }
})