import { and, eq, asc } from 'drizzle-orm'
import { quizAttempts, quizAttemptAnswers, quizQuestions } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireQuizActivity, requireEnrolledStudent, canStudentSeeScore, canStudentSeeReview } from '~~/server/utils/quiz'
import { isCourseManager } from '~~/server/utils/courseAccess'

export default defineEventHandler(async (event) => {
  const courseId = getRouterParam(event, 'id')!
  const quizId = getRouterParam(event, 'quizId')!
  const attemptId = getRouterParam(event, 'attemptId')!
  const { user } = await requireUserSession(event)
  const activity = await requireQuizActivity(event, courseId, quizId)

  const isManager = user.role === 'admin' || (user.role === 'teacher' && (await isCourseManager(user.id, courseId)))
  const where = isManager
    ? and(eq(quizAttempts.id, attemptId), eq(quizAttempts.activityId, quizId))
    : and(eq(quizAttempts.id, attemptId), eq(quizAttempts.activityId, quizId), eq(quizAttempts.studentId, (await requireEnrolledStudent(user.id, courseId)).id))

  const attempt = await db.query.quizAttempts.findFirst({ where })
  if (!attempt) throw createError({ statusCode: 404, statusMessage: 'Percobaan tidak ditemukan' })

  const questions = await db.select().from(quizQuestions).where(eq(quizQuestions.activityId, quizId)).orderBy(asc(quizQuestions.position))
  const answers = await db.select().from(quizAttemptAnswers).where(eq(quizAttemptAnswers.attemptId, attemptId))

  // Siswa hanya melihat kunci jawaban bila guru mengizinkan review & attempt sudah selesai.
  const reveal = isManager || canStudentSeeReview(activity as any, attempt.status)
  const showScore = isManager || canStudentSeeScore(activity as any)

  // Siswa hanya menerima soal yang menyasar kelasnya (targetClassIds null = semua kelas)
  let visibleQuestions = questions
  if (!isManager) {
    const enrolled = await requireEnrolledStudent(user.id, courseId)
    visibleQuestions = questions.filter((q) => {
      if (!q.targetClassIds) return true
      try {
        const ids = JSON.parse(q.targetClassIds) as string[]
        return !ids.length || (!!enrolled.classId && ids.includes(enrolled.classId))
      } catch { return true }
    })
  }

  return {
    data: {
      attempt: {
        ...attempt,
        ...(showScore ? {} : { score: null }),
        expiresAt: activity.durationMinutes ? new Date(attempt.startedAt.getTime() + activity.durationMinutes * 60000) : null,
        examMode: activity.examMode,
        title: activity.title,
        scoreVisibility: (activity as any).scoreVisibility ?? 'immediate',
        reviewMode: (activity as any).reviewMode ?? 'immediate',
        canReview: isManager || canStudentSeeReview(activity as any, attempt.status),
      },
      questions: visibleQuestions.map((q) => ({
        id: q.id,
        position: q.position,
        points: q.points,
        type: q.type,
        question: q.question,
        ...(reveal ? { explanation: q.explanation } : {}),
        options: q.optionsJson
          ? (JSON.parse(q.optionsJson) as any[]).map((o) => ({ id: o.id, label: o.label, text: o.text, ...(reveal ? { isCorrect: o.isCorrect } : {}) }))
          : [],
      })),
      answers: reveal
        ? answers
        : answers.filter((a) => visibleQuestions.some((q) => q.id === a.quizQuestionId)).map((a) => ({ id: a.id, attemptId: a.attemptId, quizQuestionId: a.quizQuestionId, selectedOptionId: a.selectedOptionId, answerText: a.answerText })),
      canGrade: isManager,
    },
  }
})
