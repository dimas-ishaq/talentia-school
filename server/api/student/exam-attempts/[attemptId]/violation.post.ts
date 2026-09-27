// POST /api/student/exam-attempts/[attemptId]/violation — catat pelanggaran & auto-lock sesuai threshold
import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { quizAttempts, students, examEventSubjects } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { recordViolation } from '~~/server/utils/exam'

const schema = z.object({
  type: z.enum(['tab_switch', 'copy', 'paste', 'cut', 'context_menu', 'focus_lost', 'fullscreen_exit']),
  detail: z.string().max(500).optional(),
})

export default defineEventHandler(async (event) => {
  const attemptId = String(getRouterParam(event, 'attemptId') ?? '')
  const { user } = await requireUserSession(event)
  if (user.role !== 'student') throw createError({ statusCode: 403, statusMessage: 'Hanya siswa' })

  const student = await db.query.students.findFirst({ where: eq(students.userId, user.id) })
  if (!student) throw createError({ statusCode: 403, statusMessage: 'Data siswa tidak ditemukan' })
  const attempt = await db.query.quizAttempts.findFirst({
    where: and(eq(quizAttempts.id, attemptId), eq(quizAttempts.studentId, student.id)),
  })
  if (!attempt) throw createError({ statusCode: 404, statusMessage: 'Percobaan tidak ditemukan' })
  if (attempt.status !== 'in_progress') throw createError({ statusCode: 400, statusMessage: 'Percobaan sudah selesai' })

  const body = schema.parse(await readBody(event))

  // Ambil konfigurasi lock dari mapel
  const subj = await db.query.examEventSubjects.findFirst({ where: eq(examEventSubjects.activityId, attempt.activityId) })
  if (!subj) throw createError({ statusCode: 404, statusMessage: 'Mapel ujian tidak ditemukan' })

  // Jika lock disabled, hanya catat warning tanpa lock
  const threshold = subj.lockEnabled ? (subj.maxViolations ?? 3) : Number.MAX_SAFE_INTEGER
  const result = await recordViolation(attemptId, body.type, body.detail ?? '', threshold)

  return { data: { ...result, lockEnabled: subj.lockEnabled } }
})
