import { eq } from 'drizzle-orm'
import { examEvents, examEventSubjects, examEventClasses, examEventSubjectClasses, examSesi, examSessions, activities } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireAdmin } from '~~/server/utils/requireAdmin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = String(getRouterParam(event, 'id') ?? '')
  const record = await db.query.examEvents.findFirst({ where: eq(examEvents.id, id) })
  if (!record) throw createError({ statusCode: 404, statusMessage: 'Event tidak ditemukan' })
  if (record.status !== 'draft') throw createError({ statusCode: 400, statusMessage: 'Event sudah dipublikasikan atau ditutup' })

  const [subjects, classes, sesi, subjectClasses] = await Promise.all([
    db.query.examEventSubjects.findMany({ where: eq(examEventSubjects.eventId, id) }),
    db.query.examEventClasses.findMany({ where: eq(examEventClasses.eventId, id) }),
    db.query.examSesi.findMany({ where: eq(examSesi.eventId, id) }),
    db.query.examEventSubjectClasses.findMany(),
  ])
  if (!subjects.length) throw createError({ statusCode: 400, statusMessage: 'Tambahkan minimal satu mapel' })
  if (!classes.length) throw createError({ statusCode: 400, statusMessage: 'Tambahkan minimal satu kelas' })
  if (!sesi.length || sesi.some((s) => !s.openAt || !s.closeAt || new Date(s.openAt) >= new Date(s.closeAt))) {
    throw createError({ statusCode: 400, statusMessage: 'Jadwal sesi belum lengkap atau tidak valid' })
  }
  const subjectIds = new Set(subjects.map((subject) => subject.id))
  const selectedSubjectIds = new Set(subjectClasses.filter((item) => subjectIds.has(item.eventSubjectId)).map((item) => item.eventSubjectId))
  if (subjects.some((subject) => !selectedSubjectIds.has(subject.id))) {
    throw createError({ statusCode: 400, statusMessage: 'Pilih kelas peserta untuk setiap mapel' })
  }

  const sessions = await db.query.examSessions.findMany({ where: eq(examSessions.eventId, id) })
  if (!sessions.length) throw createError({ statusCode: 400, statusMessage: 'Sesi mapel-kelas belum terbentuk' })

  for (const s of sesi) await db.update(examSesi).set({ status: 'published' }).where(eq(examSesi.id, s.id))
  for (const s of sessions) await db.update(examSessions).set({ status: 'published' }).where(eq(examSessions.id, s.id))
  for (const s of subjects) {
    await db.update(activities).set({ status: 'published', openAt: sesi.find((x) => x.id === s.sesiId)?.openAt ?? null, closeAt: sesi.find((x) => x.id === s.sesiId)?.closeAt ?? null, durationMinutes: s.durationMinutes, maxAttempts: s.maxAttempts, examMode: true }).where(eq(activities.id, s.activityId))
  }
  await db.update(examEvents).set({ status: 'published' }).where(eq(examEvents.id, id))
  return { success: true }
})
