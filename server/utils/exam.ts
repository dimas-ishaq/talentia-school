// Helper Event Ujian + sesi gelombang.
import { and, eq } from 'drizzle-orm'
import bcrypt from 'bcrypt'
import {
  examEvents, examEventSubjects, examSesi, courses, sections, activities,
  teachers, courseTeachers, quizAttempts, quizEvents, students,
} from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireOrganization } from '~~/server/utils/tenant'

export const PROCTOR_TOKEN_ROTATION_MINUTES = 5

export function generateToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const part = (length: number) => Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `${part(4)}-${part(4)}`
}

export function hashToken(token: string) {
  return bcrypt.hash(token, 10)
}

export function verifyToken(token: string, hash: string | null) {
  return hash ? bcrypt.compare(token, hash) : Promise.resolve(false)
}

/** Verifikasi token mapel (plaintext, karena perlu ditampilkan ke pengawas). */
export function verifySubjectToken(plain: string, subject: any) {
  const current = subject.tokenPlain
  const previous = subject.tokenPreviousPlain
  if (current && plain === current) return 'current' as const
  if (!previous || !subject.tokenNextRotationAt) return null
  const rotationMs = (subject.tokenRotationMinutes ?? 30) * 60_000
  const rotatedAt = new Date(subject.tokenNextRotationAt).getTime() - rotationMs
  const elapsed = Date.now() - rotatedAt
  const graceMs = (subject.tokenGraceMinutes ?? 2) * 60_000
  if (elapsed >= 0 && elapsed <= graceMs && plain === previous) return 'previous' as const
  return null
}

/** Verifikasi token proktor (plaintext). */
export function verifyProctorToken(plain: string, sesi: any) {
  const current = sesi.proctorTokenPlain
  const previous = sesi.proctorTokenPreviousPlain
  if (current && plain === current) return 'current' as const
  if (!previous || !sesi.proctorTokenNextRotationAt) return null
  const rotatedAt = new Date(sesi.proctorTokenNextRotationAt).getTime() - PROCTOR_TOKEN_ROTATION_MINUTES * 60_000
  const elapsed = Date.now() - rotatedAt
  const graceMs = (sesi.proctorTokenGraceMinutes ?? 2) * 60_000
  if (elapsed >= 0 && elapsed <= graceMs && plain === previous) return 'previous' as const
  return null
}

export async function requireExamManager(event: any, eventId: string) {
  const { user, organization } = await requireOrganization(event)
  const exam = await db.query.examEvents.findFirst({ where: and(eq(examEvents.id, eventId), eq(examEvents.organizationId, organization.id)) })
  if (!exam) throw createError({ statusCode: 404, statusMessage: 'Event tidak ditemukan' })
  if (user.role === 'admin') return exam
  if (user.role !== 'teacher') throw createError({ statusCode: 403, statusMessage: 'Akses ditolak' })

  const teacher = await db.query.teachers.findFirst({ where: and(eq(teachers.userId, user.id), eq(teachers.organizationId, organization.id)), columns: { id: true } })
  if (!teacher) throw createError({ statusCode: 403, statusMessage: 'Data guru tidak ditemukan' })
  const subjects = await db.query.examEventSubjects.findMany({ where: eq(examEventSubjects.eventId, eventId) })
  for (const subject of subjects) {
    const assigned = await db.query.courseTeachers.findFirst({
      where: and(eq(courseTeachers.courseId, subject.examCourseId), eq(courseTeachers.teacherId, teacher.id)),
    })
    if (assigned) return exam
  }
  throw createError({ statusCode: 403, statusMessage: 'Anda tidak mengampu mapel di event ini' })
}

/** Hanya admin boleh membuat/mengubah blok sesi. */
export async function requireExamSesiManager(event: any, eventId: string, sesiId: string) {
  const { user, organization } = await requireOrganization(event)
  const sesi = await db.query.examSesi.findFirst({
    where: and(eq(examSesi.id, sesiId), eq(examSesi.eventId, eventId)),
  })
  const exam = await db.query.examEvents.findFirst({
    where: and(eq(examEvents.id, eventId), eq(examEvents.organizationId, organization.id)),
    columns: { id: true },
  })
  if (!sesi || !exam) throw createError({ statusCode: 404, statusMessage: 'Sesi tidak ditemukan' })
  if (user.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Hanya admin yang mengelola sesi' })
  return sesi
}

export async function ensureExamCourse(params: {
  subjectId: string
  subjectName: string
  createdBy: string
  organizationId: string
}): Promise<{ examCourseId: string; activityId: string }> {
  const courseId = crypto.randomUUID()
  await db.insert(courses).values({
    id: courseId,
    organizationId: params.organizationId,
    name: `${params.subjectName} (Ujian)`,
    code: null,
    description: `Soal ujian — ${params.subjectName}`,
    isSystem: true, // Container internal untuk exam-event
    subjectId: params.subjectId,
    createdBy: params.createdBy,
  })

  const sectionId = crypto.randomUUID()
  await db.insert(sections).values({ id: sectionId, courseId, title: 'Soal Ujian', position: 0, isVisible: true })
  const activityId = crypto.randomUUID()
  await db.insert(activities).values({
    id: activityId,
    sectionId,
    type: 'quiz',
    title: `Ujian ${params.subjectName}`,
    content: null,
    durationMinutes: 90,
    maxAttempts: 1,
    examMode: true,
    fullscreenMode: false,
    status: 'draft',
    scoreVisibility: 'after_close',
    position: 0,
    isRequired: true,
    isVisible: true,
  })
  return { examCourseId: courseId, activityId }
}

export function isWithinWindow(now: Date, openAt: string, closeAt: string) {
  return now >= new Date(openAt) && now <= new Date(closeAt)
}

export function remainingViolations(total: number, threshold: number) {
  return threshold - (total % threshold || threshold)
}

export function shouldLock(total: number, threshold: number) {
  return total > 0 && total % threshold === 0
}

export async function ensureSubjectToken(subjectId: string, subject: any) {
  if (!subject.tokenRotationMinutes || !subject.tokenNextRotationAt || Date.now() < new Date(subject.tokenNextRotationAt).getTime()) return null
  const plaintext = generateToken()
  await db.update(examEventSubjects).set({
    tokenPreviousPlain: subject.tokenPlain,
    tokenPlain: plaintext,
    tokenHash: await hashToken(plaintext),
    tokenNextRotationAt: new Date(Date.now() + subject.tokenRotationMinutes * 60_000),
  }).where(eq(examEventSubjects.id, subjectId))
  return plaintext
}

export async function ensureProctorToken(sesiId: string, sesi: any) {
  if (sesi.proctorTokenNextRotationAt && Date.now() < new Date(sesi.proctorTokenNextRotationAt).getTime()) return null
  const plaintext = generateToken()
  await db.update(examSesi).set({
    proctorTokenPreviousPlain: sesi.proctorTokenPlain,
    proctorTokenPlain: plaintext,
    proctorTokenHash: await hashToken(plaintext),
    proctorTokenNextRotationAt: new Date(Date.now() + PROCTOR_TOKEN_ROTATION_MINUTES * 60_000),
  }).where(eq(examSesi.id, sesiId))
  return plaintext
}

export function proctorSecondsUntilNextRotation(sesi: any) {
  if (!sesi.proctorTokenNextRotationAt) return null
  return Math.max(0, Math.floor((new Date(sesi.proctorTokenNextRotationAt).getTime() - Date.now()) / 1000))
}

export async function recordViolation(attemptId: string, type: string, detail: string, threshold: number) {
  const attempt = await db.query.quizAttempts.findFirst({ where: eq(quizAttempts.id, attemptId) })
  if (!attempt) throw createError({ statusCode: 404, statusMessage: 'Percobaan tidak ditemukan' })
  const violationCount = attempt.violationCount + 1
  const lock = shouldLock(violationCount, threshold)
  const student = await db.query.students.findFirst({ where: eq(students.id, attempt.studentId) })
  await db.insert(quizEvents).values({
    id: crypto.randomUUID(), attemptId, activityId: attempt.activityId, studentId: attempt.studentId,
    userId: student?.userId ?? null, type: lock ? 'lock' : 'warning', detail: `${type}: ${detail}`,
  })
  await db.update(quizAttempts).set({
    violationCount,
    lockStatus: lock ? 'locked' : 'ok',
    lockedAt: lock ? new Date() : attempt.lockedAt,
    lockReason: lock ? `${type} (${violationCount})` : attempt.lockReason,
  }).where(eq(quizAttempts.id, attemptId))
  return { violationCount, locked: lock, remaining: remainingViolations(violationCount, threshold) }
}
