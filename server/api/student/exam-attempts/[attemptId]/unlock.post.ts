// POST /api/student/exam-attempts/[attemptId]/unlock — siswa submit proktor token untuk membuka ujian terkunci
import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { quizAttempts, quizEvents, students, examSesi, examSessions } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { verifyProctorToken, ensureProctorToken } from '~~/server/utils/exam'

const schema = z.object({ token: z.string().trim().min(1).max(50) })

export default defineEventHandler(async (event) => {
  const attemptId = String(getRouterParam(event, 'attemptId') ?? '')
  const { user } = await requireUserSession(event)
  if (user.role !== 'student') throw createError({ statusCode: 403, statusMessage: 'Hanya siswa' })

  const body = schema.parse(await readBody(event))

  // Cek ownership & kondisi locked
  const student = await db.query.students.findFirst({ where: eq(students.userId, user.id) })
  if (!student) throw createError({ statusCode: 403, statusMessage: 'Data siswa tidak ditemukan' })
  const attempt = await db.query.quizAttempts.findFirst({
    where: and(eq(quizAttempts.id, attemptId), eq(quizAttempts.studentId, student.id)),
  })
  if (!attempt) throw createError({ statusCode: 404, statusMessage: 'Percobaan tidak ditemukan' })
  if (attempt.lockStatus !== 'locked') throw createError({ statusCode: 400, statusMessage: 'Percobaan tidak dalam kondisi terkunci' })

  // Ambil sesi dari sessionId → sesi ini punya proktor token
  if (!attempt.sessionId) throw createError({ statusCode: 400, statusMessage: 'Percobaan bukan bagian dari sesi ujian' })
  const session = await db.query.examSessions.findFirst({ where: eq(examSessions.id, attempt.sessionId) })
  if (!session || !session.sesiId) throw createError({ statusCode: 404, statusMessage: 'Data sesi tidak lengkap' })

  // Rotate & fetch sesi terbaru jika sudah lewat waktu rotasi
  let sesi = await db.query.examSesi.findFirst({ where: eq(examSesi.id, session.sesiId) })
  if (sesi && sesi.proctorTokenNextRotationAt && Date.now() >= new Date(sesi.proctorTokenNextRotationAt).getTime()) {
    const fresh = await ensureProctorToken(session.sesiId, sesi)
    if (fresh) sesi = await db.query.examSesi.findFirst({ where: eq(examSesi.id, session.sesiId) })!
  }
  if (!sesi) throw createError({ statusCode: 404, statusMessage: 'Data sesi tidak ditemukan' })

  // Verifikasi token proktor (plaintext comparison with grace check)
  const match = verifyProctorToken(body.token, sesi)
  if (!match) throw createError({ statusCode: 401, statusMessage: 'Token proktor salah atau kedaluwarsa' })

  // Unlock
  await db.update(quizAttempts).set({
    lockStatus: 'ok',
    unlockedBy: null, // karena unlock via token, bukan langsung oleh proktor
    lastUnlockedAt: new Date(),
    lastUnlockMethod: 'proctor_token',
  }).where(eq(quizAttempts.id, attemptId))

  await db.insert(quizEvents).values({
    id: crypto.randomUUID(), attemptId, activityId: attempt.activityId, studentId: attempt.studentId, userId: user.id,
    type: 'unlock', detail: `token (${match})`,
  })

  return { success: true }
})
