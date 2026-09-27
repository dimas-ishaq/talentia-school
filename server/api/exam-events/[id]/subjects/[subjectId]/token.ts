// GET  /api/exam-events/[id]/subjects/[subjectId]/token — token buka ujian + countdown (admin/teacher manager)
import { eq } from 'drizzle-orm'
import { examEventSubjects } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireExamManager, ensureSubjectToken, generateToken, hashToken } from '~~/server/utils/exam'

export default defineEventHandler(async (event) => {
  const eventId = String(getRouterParam(event, 'id') ?? '')
  const subjectId = String(getRouterParam(event, 'subjectId') ?? '')
  await requireExamManager(event, eventId)
  const { user } = await requireUserSession(event)
  if (!['admin', 'teacher'].includes(user.role)) throw createError({ statusCode: 403, statusMessage: 'Hanya admin/guru' })

  let subj = await db.query.examEventSubjects.findFirst({ where: eq(examEventSubjects.id, subjectId) })
  if (!subj || subj.eventId !== eventId) throw createError({ statusCode: 404, statusMessage: 'Mapel tidak ditemukan' })

  // Rotasi lazy jika sudah lewat
  if (subj.tokenRotationMinutes && subj.tokenNextRotationAt) {
    const fresh = await ensureSubjectToken(subjectId, subj)
    if (fresh) subj = (await db.query.examEventSubjects.findFirst({ where: eq(examEventSubjects.id, subjectId) }))!
  }

  return { data: subj }
})
