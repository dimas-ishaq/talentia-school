// GET /api/exam-events/[id]/sesi/[sesiId]/monitor — daftar siswa per sesi (admin/guru pengampu)
// Polling 30 detik dari frontend. Query ringan: nama, NIS, status, pelanggaran, jawaban terakhir.
import { eq, and, asc, inArray } from 'drizzle-orm'
import { examSesi, examSessions, examEventSubjects, quizAttempts, students } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireExamManager } from '~~/server/utils/exam'

export default defineEventHandler(async (event) => {
  const eventId = String(getRouterParam(event, 'id') ?? '')
  const sesiId = String(getRouterParam(event, 'sesiId') ?? '')
  await requireExamManager(event, eventId)

  const sesi = await db.query.examSesi.findFirst({ where: eq(examSesi.id, sesiId) })
  if (!sesi || sesi.eventId !== eventId) throw createError({ statusCode: 404, statusMessage: 'Sesi tidak ditemukan' })

  // Semua sessions di sesi ini
  const sessions = await db.query.examSessions.findMany({
    where: eq(examSessions.sesiId, sesiId),
    orderBy: [asc(examSessions.classId)],
    with: {
      class: true,
      eventSubject: { with: { subject: true } },
    },
  })

  // Semua attempts di sessions ini
  const sessionIds = sessions.map((s) => s.id)
  if (!sessionIds.length) return { data: { sesi, sessions: [], attempts: [] } }

  const attempts = await db.select({
    id: quizAttempts.id,
    sessionId: quizAttempts.sessionId,
    studentId: quizAttempts.studentId,
    status: quizAttempts.status,
    violationCount: quizAttempts.violationCount,
    lockStatus: quizAttempts.lockStatus,
    lockReason: quizAttempts.lockReason,
    lastUnlockedAt: quizAttempts.lastUnlockedAt,
    lastUnlockMethod: quizAttempts.lastUnlockMethod,
    score: quizAttempts.score,
    startedAt: quizAttempts.startedAt,
    createdAt: quizAttempts.createdAt,
  }).from(quizAttempts)
    .where(inArray(quizAttempts.sessionId, sessionIds))

  // Batch fetch student + user info
  const studentIds = [...new Set(attempts.map((a) => a.studentId))]
  const studentRows = studentIds.length
    ? await db.query.students.findMany({
        where: inArray(students.id, studentIds),
        with: { user: { columns: { id: true, name: true } } },
      })
    : []
  const studentMap = new Map(studentRows.map((s) => [s.id, s]))

  return {
    data: {
      sesi,
      sessions: sessions.map((s) => ({ id: s.id, classId: s.classId, className: s.class.name, subjectId: s.eventSubject.subjectId, subjectName: s.eventSubject.subject.name, openAt: s.openAt, closeAt: s.closeAt })),
      attempts: attempts.map((a) => {
        const stu = studentMap.get(a.studentId)
        return {
          ...a,
          studentName: stu?.user?.name ?? '-',
          nis: stu?.nis ?? '-',
          className: sessions.find((s) => s.id === a.sessionId)?.class?.name ?? '-',
          subjectName: sessions.find((s) => s.id === a.sessionId)?.eventSubject?.subject?.name ?? '-',
        }
      }),
    },
  }
})
