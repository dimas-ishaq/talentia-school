// GET /api/student/exam-sessions — daftar ujian untuk siswa (kelasnya), dengan status
import { eq, and, inArray } from 'drizzle-orm'
import { examSessions, examEventSubjects, examEvents, examSesi, quizAttempts, students, subjects, classes } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireOrganization } from '~~/server/utils/tenant'

function deriveStatus(session: any, attempt: any, now: number) {
  if (attempt?.lockStatus === 'locked') return 'terkunci'
  if (attempt?.status === 'in_progress') return 'sedang'
  if (attempt && ['submitted', 'auto_submitted', 'needs_grading'].includes(attempt.status)) return 'dikerjakan'
  if (now > new Date(session.closeAt).getTime()) return 'terlambat'
  if (now < new Date(session.openAt).getTime()) return 'belum_dibuka'
  return 'belum'
}

export default defineEventHandler(async (event) => {
  const { user, organization } = await requireOrganization(event)
  if (user.role !== 'student') throw createError({ statusCode: 403, statusMessage: 'Hanya siswa' })

  const student = await db.query.students.findFirst({ where: and(eq(students.userId, user.id), eq(students.organizationId, organization.id)) })
  if (!student?.classId) return { data: [] }

  // Sessions untuk kelas siswa, hanya event published & sesi published
  const rows = await db.query.examSessions.findMany({
    where: eq(examSessions.classId, student.classId),
    with: {
      class: true,
      eventSubject: { with: { subject: true } },
      sesi: true,
    },
  })

  const filtered = rows.filter((r) => r.sesi && r.sesi.status === 'published')
  if (!filtered.length) return { data: [] }

  const sessionIds = filtered.map((r) => r.id)
  const attempts = await db.query.quizAttempts.findMany({
    where: and(eq(quizAttempts.studentId, student.id), inArray(quizAttempts.sessionId, sessionIds)),
  })
  const attemptMap = new Map(attempts.map((a) => [a.sessionId, a]))

  const now = Date.now()
  const eventIds = [...new Set(filtered.map((r) => r.eventId))]
  const events = eventIds.length ? await db.query.examEvents.findMany({ where: inArray(examEvents.id, eventIds) }) : []
  const eventMap = new Map(events.map((e) => [e.id, e]))

  return {
    data: filtered.map((s) => {
      const attempt = attemptMap.get(s.id)
      return {
        sessionId: s.id,
        eventId: s.eventId,
        eventName: eventMap.get(s.eventId)?.name ?? '-',
        eventType: eventMap.get(s.eventId)?.type ?? '-',
        sesiName: s.sesi?.name ?? '-',
        subjectName: s.eventSubject?.subject?.name ?? '-',
        subjectId: s.eventSubject?.subjectId,
        activityId: s.eventSubject?.activityId,
        examSubjectId: s.eventSubject?.id,
        openAt: s.openAt,
        closeAt: s.closeAt,
        durationMinutes: s.durationMinutes,
        status: deriveStatus(s, attempt, now),
        attemptId: attempt?.id ?? null,
        attemptStatus: attempt?.status ?? null,
        violationCount: attempt?.violationCount ?? 0,
        lockStatus: attempt?.lockStatus ?? 'ok',
        score: attempt?.score ?? null,
      }
    }),
  }
})
