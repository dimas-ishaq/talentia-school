// GET /api/student/exam-attempts/[attemptId] — detail soal + jawaban + status lock, dengan shuffle per attempt
import { and, eq, asc } from 'drizzle-orm'
import { quizAttempts, quizAttemptAnswers, quizQuestions, students } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

export default defineEventHandler(async (event) => {
  const attemptId = String(getRouterParam(event, 'attemptId') ?? '')
  const { user, organization } = await requireOrganization(event)
  if (user.role !== 'student') throw createError({ statusCode: 403, statusMessage: 'Hanya siswa' })

  const student = await db.query.students.findFirst({ where: and(eq(students.userId, user.id), eq(students.organizationId, organization.id)) })
  if (!student) throw createError({ statusCode: 403, statusMessage: 'Data siswa tidak ditemukan' })

  const attempt = await db.query.quizAttempts.findFirst({
    where: eq(quizAttempts.id, attemptId),
    with: { session: true },
  })
  if (!attempt || attempt.studentId !== student.id) throw createError({ statusCode: 404, statusMessage: 'Percobaan tidak ditemukan' })

  // Generate-seeded shuffle (stable per attempt)
  const questions = await db.select().from(quizQuestions).where(eq(quizQuestions.activityId, attempt.activityId)).orderBy(asc(quizQuestions.position))
  const answers = await db.select().from(quizAttemptAnswers).where(eq(quizAttemptAnswers.attemptId, attemptId))

  // Shuffle deterministik dari shuffleSeed (xor-shift)
  const shuffle = <T>(arr: T[], seed: number) => {
    const out = [...arr]; let s = seed || 1
    for (let i = out.length - 1; i > 0; i--) {
      s = (s * 1664525 + 1013904223) & 0x7fffffff
      const j = s % (i + 1)
      const tmp = out[i]!
      out[i] = out[j]!
      out[j] = tmp
    }
    return out
  }
  const shuffled = shuffle(questions, attempt.shuffleSeed)
  const durationMinutes = attempt.session?.durationMinutes ?? 90
  return {
    data: {
      attempt: {
        ...attempt,
        expiresAt: attempt.sessionId ? new Date(attempt.startedAt.getTime() + durationMinutes * 60000) : null,
        durationMinutes,
      },
      questions: shuffled.map((q) => ({
        id: q.id, position: q.position, points: q.points, type: q.type, question: q.question,
        options: q.optionsJson ? JSON.parse(q.optionsJson) as { id: string; label: string; text: string }[] : [],
      })),
      answers: answers.map((a) => ({ id: a.id, quizQuestionId: a.quizQuestionId, selectedOptionId: a.selectedOptionId, answerText: a.answerText })),
    },
  }
})
