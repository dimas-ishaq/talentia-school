import { z } from 'zod'
import { requireQuizActivity, requireEnrolledStudent } from '~~/server/utils/quiz'
import { requireAttemptOwner, logQuizEvent, enforceQuizRateLimit } from '~~/server/utils/quizSecurity'

const schema = z.object({
  attemptId: z.string().uuid(),
  type: z.enum(['tab_switch', 'copy', 'paste', 'cut', 'context_menu', 'focus_lost']),
  detail: z.string().max(500).optional(),
})

export default defineEventHandler(async (event) => {
  const courseId = getRouterParam(event, 'id')!
  const quizId = getRouterParam(event, 'quizId')!
  const { user } = await requireUserSession(event)
  if (user.role !== 'student') throw createError({ statusCode: 403, statusMessage: 'Hanya siswa' })
  await requireQuizActivity(event, courseId, quizId)
  const student = await requireEnrolledStudent(user.id, courseId)
  const body = schema.parse(await readBody(event))

  enforceQuizRateLimit(`quiz-event:${student.id}:${body.attemptId}`, 60, 60_000)
  const attempt = await requireAttemptOwner(body.attemptId, quizId, student.id)
  if (attempt.status !== 'in_progress') throw createError({ statusCode: 400, statusMessage: 'Percobaan sudah selesai' })
  await logQuizEvent({ attemptId: attempt.id, type: body.type, detail: body.detail })
  return { success: true }
})
