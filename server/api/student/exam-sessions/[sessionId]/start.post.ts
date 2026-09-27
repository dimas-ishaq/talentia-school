// POST /api/student/exam-sessions/[sessionId]/start — mulai ujian dengan token (jika ada)
import { z } from 'zod'
import { eq, and, asc, desc, inArray, count } from 'drizzle-orm'
import { examSessions, examEventSubjects, quizAttempts, students } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { verifySubjectToken, ensureSubjectToken } from '~~/server/utils/exam'

const schema = z.object({ token: z.string().trim().min(1).max(50).optional() })

export default defineEventHandler(async (event) => {
  const sessionId = String(getRouterParam(event, 'sessionId') ?? '')
  const { user } = await requireUserSession(event)
  if (user.role !== 'student') throw createError({ statusCode: 403, statusMessage: 'Hanya siswa' })

  const body = schema.parse(await readBody(event))
  const student = await db.query.students.findFirst({ where: eq(students.userId, user.id) })
  if (!student?.classId) throw createError({ statusCode: 403, statusMessage: 'Data siswa tidak ditemukan' })

  // Ambil sesi + validasi: kelas cocok, waktu aktif, not closed
  const session = await db.query.examSessions.findFirst({
    where: and(eq(examSessions.id, sessionId), eq(examSessions.classId, student.classId)),
    with: { eventSubject: true },
  })
  if (!session) throw createError({ statusCode: 404, statusMessage: 'Sesi tidak ditemukan atau bukan milikmu' })

  const now = Date.now()
  if (new Date(session.openAt).getTime() > now) throw createError({ statusCode: 400, statusMessage: 'Ujian belum dibuka' })
  if (new Date(session.closeAt).getTime() < now) throw createError({ statusCode: 400, statusMessage: 'Ujian sudah ditutup' })

  // Verifikasi token mapel (selalu wajib untuk membuka ujian)
  let subj = session.eventSubject!
  if (subj.tokenRotationMinutes) {
    const rotated = await ensureSubjectToken(subj.id, subj)
    if (rotated) subj = (await db.query.examEventSubjects.findFirst({ where: eq(examEventSubjects.id, subj.id) }))!
  }
  if (!body.token) throw createError({ statusCode: 400, statusMessage: 'Token ujian wajib diisi' })
  const match = verifySubjectToken(body.token, subj)
  if (!match) throw createError({ statusCode: 401, statusMessage: 'Token salah atau kedaluwarsa' })

  // Cek max attempts: hitung completed attempts untuk activity ini
  const completed = await db.select().from(quizAttempts).where(and(eq(quizAttempts.activityId, subj.activityId), eq(quizAttempts.studentId, student.id)))
  const completedCount = completed.filter((a) => ['submitted', 'auto_submitted', 'abandoned'].includes(a.status)).length
  const subjectMax = subj.maxAttempts ?? 9999
  if (completedCount >= subjectMax) throw createError({ statusCode: 400, statusMessage: `Batas percobaan tercapai (${subjectMax})` })

  // Resume in-progress attempt (session-aware, bukan per course)
  const inProgress = completed.find((a) => a.status === 'in_progress')
  if (inProgress) return { data: { attemptId: inProgress.id, started: true } }

  // Generate shuffle seed deterministik (random tapi tetap per attempt)
  const seed = Math.floor(Math.random() * 2_147_483_647)

  // Buat attempt baru
  const attemptId = crypto.randomUUID()
  await db.insert(quizAttempts).values({
    id: attemptId,
    activityId: subj.activityId,
    studentId: student.id,
    attemptNumber: completedCount + 1,
    startedAt: new Date(),
    status: 'in_progress',
    sessionId,
    shuffleSeed: seed,
    violationCount: 0,
    lockStatus: 'ok',
  })

  return { data: { attemptId, started: true, shuffleSeed: seed } }
})
