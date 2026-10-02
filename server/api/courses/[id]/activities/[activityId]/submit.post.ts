// server/api/courses/[id]/activities/[activityId]/submit.post.ts
// Siswa mengirim submission (assignment/forum) atau menandai activity dilihat.
// Fase 1: completion dihitung lewat evaluateCompletion (server = sumber kebenaran).
// Fase 2: deadline divalidasi di server; late ditandai, bukan ditolak, kecuali
//         guru menutup allowLateSubmission.
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { activities, students, courseClasses, sections, activityProgress } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { findCourseOrThrow } from '~~/server/utils/courseAccess'
import { requireOrganization } from '~~/server/utils/tenant'
import { evaluateCompletion } from '~~/server/utils/completion'

const fileSchema = z.object({ name: z.string().max(200), url: z.string().max(500) })
const schema = z.object({
  submission: z.string().trim().max(5000).optional(),
  submissionLink: z.string().trim().max(500).optional(),
  submissionFiles: z.array(fileSchema).max(5).optional(),
})

const SUBMIT_TYPES = ['assignment', 'forum']

export default defineEventHandler(async (event) => {
  const { user, organization } = await requireOrganization(event)
  if (user.role !== 'student') throw createError({ statusCode: 403, statusMessage: 'Hanya siswa' })

  const courseId = getRouterParam(event, 'id')!
  const activityId = getRouterParam(event, 'activityId')!
  const body = schema.parse((await readBody(event)) ?? {})

  // Batas kepercayaan: siswa hanya boleh menautkan file hasil upload internal
  // (prefix /uploads/) dan link http(s) — bukan URL sembarang.
  if (body.submissionLink && !/^https?:\/\/\S+$/i.test(body.submissionLink)) {
    throw createError({ statusCode: 400, statusMessage: 'Link harus diawali http:// atau https://' })
  }
  for (const f of body.submissionFiles ?? []) {
    if (!/^\/uploads\/[A-Za-z0-9._-]+$/.test(f.url)) throw createError({ statusCode: 400, statusMessage: `File tidak valid: ${f.name}` })
  }

  await findCourseOrThrow(courseId, organization.id)

  const student = await db.query.students.findFirst({
    where: and(eq(students.userId, user.id), eq(students.organizationId, organization.id)),
    columns: { id: true, classId: true },
  })
  if (!student?.classId) throw createError({ statusCode: 403, statusMessage: 'Data siswa tidak ditemukan' })

  const enrolled = await db.query.courseClasses.findFirst({
    where: and(eq(courseClasses.courseId, courseId), eq(courseClasses.classId, student.classId)),
    columns: { courseId: true },
  })
  if (!enrolled) throw createError({ statusCode: 403, statusMessage: 'Anda tidak terdaftar di course ini' })

  const activity = await db.query.activities.findFirst({ where: eq(activities.id, activityId) })
  if (!activity) throw createError({ statusCode: 404, statusMessage: 'Activity tidak ditemukan' })

  const section = await db.query.sections.findFirst({
    where: eq(sections.id, activity.sectionId),
    columns: { courseId: true },
  })
  if (!section || section.courseId !== courseId) {
    throw createError({ statusCode: 404, statusMessage: 'Activity tidak ditemukan di course ini' })
  }

  const existing = await db.query.activityProgress.findFirst({
    where: and(eq(activityProgress.activityId, activityId), eq(activityProgress.studentId, student.id)),
  })

  const now = new Date()
  const hasPayload = body.submission?.trim() || body.submissionLink?.trim() || body.submissionFiles?.length
  const isSubmit = SUBMIT_TYPES.includes(activity.type) && !!hasPayload
  if (isSubmit && activity.type === 'assignment' && !hasPayload) throw createError({ statusCode: 400, statusMessage: 'Submission wajib diisi' })

  // Fase 2: deadline ditegakkan di server, bukan hanya di UI.
  const dueMs: number | null = activity.dueDate ? new Date(String(activity.dueDate)).getTime() : null
  if (activity.dueDate && (dueMs == null || !Number.isFinite(dueMs))) throw createError({ statusCode: 400, statusMessage: 'Tenggat activity tidak valid' })
  const isLate = dueMs != null && now.getTime() > dueMs
  if (isSubmit && isLate && !activity.allowLateSubmission) {
    throw createError({ statusCode: 400, statusMessage: 'Batas pengumpulan sudah lewat. Hubungi guru bila ada keringanan.' })
  }

  const values: Record<string, any> = {
    viewedAt: existing?.viewedAt ?? now,
    isLate: isSubmit ? isLate : (existing?.isLate ?? false),
  }
  if (isSubmit) {
    values.submission = body.submission?.trim() ? body.submission : null
    values.submissionLink = body.submissionLink?.trim() ? body.submissionLink : null
    values.submissionFiles = body.submissionFiles?.length ? JSON.stringify(body.submissionFiles) : null
    // Revisi setelah dikembalikan: perbarui waktu pengumpulan agar audit benar.
    values.submittedAt = existing?.returnedAt ? now : (existing?.submittedAt ?? now)
    // Tugas yang dikembalikan guru boleh dikirim ulang; bersihkan jejak revisi + nilai lama.
    if (existing?.returnedAt) {
      values.returnedAt = null
      values.returnReason = null
      values.score = null
      values.feedback = null
      values.gradedAt = null
      values.scorePublishedAt = null
    }
  }

  const merged = { ...existing, ...values }
  const decision = evaluateCompletion({ activity, progress: merged })
  values.completedAt = decision.done ? (existing?.completedAt ?? now) : null

  if (existing) {
    await db.update(activityProgress).set(values).where(eq(activityProgress.id, existing.id))
  } else {
    await db.insert(activityProgress).values({
      id: crypto.randomUUID(),
      activityId,
      studentId: student.id,
      ...values,
    })
  }

  // Response ringkas + konsisten untuk UI siswa.
  return { success: true }
})
