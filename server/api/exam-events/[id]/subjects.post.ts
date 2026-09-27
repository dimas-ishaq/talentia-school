// POST /api/exam-events/[id]/subjects — tambah mapel ke event (di dalam sebuah sesi)
// Otomatis: buat exam course + section + quiz activity + sesi per kelas (warisi jadwal sesi)
import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import {
  examEvents, examEventSubjects, examEventClasses, examEventSubjectClasses, examSessions, examSesi,
  subjects, courseTeachers,
} from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireExamManager, ensureExamCourse, generateToken, hashToken } from '~~/server/utils/exam'

const schema = z.object({
  subjectId: z.string().trim().min(1),
  sesiId: z.string().trim().min(1),
  classIds: z.array(z.string().trim().min(1)).min(1),
  teacherIds: z.array(z.string()).optional().default([]),
  passingGrade: z.number().min(0).max(100).optional().default(75),
  durationMinutes: z.number().int().min(1).max(600).optional().default(90),
  maxAttempts: z.number().int().min(1).max(10).optional().default(1),
  shuffleQuestions: z.boolean().optional().default(false),
  shuffleOptions: z.boolean().optional().default(false),
  lockEnabled: z.boolean().optional().default(true),
  maxViolations: z.number().int().min(1).max(50).optional().default(3),
  lockOnClipboard: z.boolean().optional().default(true),
  lockOnFullscreenExit: z.boolean().optional().default(true),
  tokenRotationMinutes: z.number().int().min(0).max(1440).nullable().optional().default(null),
})

export default defineEventHandler(async (event) => {
  const eventId = String(getRouterParam(event, 'id') ?? '')
  await requireExamManager(event, eventId)
  const { user } = await requireUserSession(event)
  const body = schema.parse(await readBody(event))

  const ev = await db.query.examEvents.findFirst({ where: eq(examEvents.id, eventId) })
  if (!ev) throw createError({ statusCode: 404, statusMessage: 'Event tidak ditemukan' })

  const sesi = await db.query.examSesi.findFirst({
    where: and(eq(examSesi.id, body.sesiId), eq(examSesi.eventId, eventId)),
  })
  if (!sesi) throw createError({ statusCode: 404, statusMessage: 'Sesi tidak ditemukan di event ini' })

  const subject = await db.query.subjects.findFirst({ where: eq(subjects.id, body.subjectId) })
  if (!subject) throw createError({ statusCode: 404, statusMessage: 'Mapel tidak ditemukan' })

  const eventClasses = await db.query.examEventClasses.findMany({ where: eq(examEventClasses.eventId, eventId) })
  const allowedClassIds = new Set(eventClasses.map((item) => item.classId))
  const classIds = [...new Set(body.classIds)]
  if (classIds.some((classId) => !allowedClassIds.has(classId))) {
    throw createError({ statusCode: 400, statusMessage: 'Pilih kelas yang sudah terdaftar sebagai peserta event' })
  }

  const dup = await db.query.examEventSubjects.findFirst({
    where: and(eq(examEventSubjects.eventId, eventId), eq(examEventSubjects.subjectId, body.subjectId)),
  })
  if (dup) throw createError({ statusCode: 400, statusMessage: 'Mapel sudah ada di event ini' })

  const { examCourseId, activityId } = await ensureExamCourse({
    subjectId: body.subjectId,
    subjectName: subject.name,
    createdBy: user.id,
  })

  // Guru pengampu (multi-guru)
  const teacherIds = [...new Set(body.teacherIds)]
  if (teacherIds.length) {
    const valid = await db.query.teachers.findMany({ columns: { id: true } })
    const validIds = new Set(valid.map((t) => t.id))
    const rows = teacherIds.filter((id) => validIds.has(id)).map((tid) => ({ courseId: examCourseId, teacherId: tid }))
    if (rows.length) await db.insert(courseTeachers).values(rows)
  }

  // Token buka ujian (per mapel)
  const token = generateToken()
  const eventSubjectId = crypto.randomUUID()
  const rotationMinutes = body.tokenRotationMinutes || null

  await db.insert(examEventSubjects).values({
    id: eventSubjectId,
    eventId,
    subjectId: body.subjectId,
    examCourseId,
    activityId,
    sesiId: body.sesiId,
    passingGrade: body.passingGrade,
    shuffleQuestions: body.shuffleQuestions,
    shuffleOptions: body.shuffleOptions,
    maxAttempts: body.maxAttempts,
    durationMinutes: body.durationMinutes,
    tokenHash: await hashToken(token),
    tokenPlain: token,
    tokenRotationMinutes: rotationMinutes,
    tokenNextRotationAt: rotationMinutes ? new Date(Date.now() + rotationMinutes * 60_000) : null,
    lockEnabled: body.lockEnabled,
    maxViolations: body.maxViolations,
    lockOnClipboard: body.lockOnClipboard,
    lockOnFullscreenExit: body.lockOnFullscreenExit,
    createdBy: user.id,
  })

  await db.insert(examEventSubjectClasses).values(classIds.map((classId) => ({
    eventSubjectId,
    classId,
  })))

  // Buat sesi (mapel × kelas) hanya untuk kelas yang dipilih
  await db.insert(examSessions).values(classIds.map((classId) => ({
    id: crypto.randomUUID(),
    eventId,
    eventSubjectId,
    sesiId: body.sesiId,
    classId,
    openAt: sesi.openAt,
    closeAt: sesi.closeAt,
    durationMinutes: body.durationMinutes,
    status: 'draft' as const,
  })))

  return { data: { id: eventSubjectId, token, examCourseId, activityId, sessions: classIds.length } }
})
