// POST /api/exam-events/[id]/classes — tambah kelas peserta
// Otomatis buat sesi (mapel × kelas) untuk semua mapel yang sudah ada
import { z } from 'zod'
import { eq, and, inArray } from 'drizzle-orm'
import { classes, examEvents, examEventSubjects, examEventClasses, examSessions, examSesi } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireExamManager } from '~~/server/utils/exam'

const schema = z.object({ classIds: z.array(z.string().trim().min(1)).min(1) })

export default defineEventHandler(async (event) => {
  const eventId = String(getRouterParam(event, 'id') ?? '')
  const ev = await requireExamManager(event, eventId)
  const body = schema.parse(await readBody(event))

  const owned = await db.query.classes.findMany({ where: and(inArray(classes.id, body.classIds), eq(classes.organizationId, ev.organizationId!)), columns: { id: true } })
  const ownedIds = new Set(owned.map((c) => c.id))
  const foreign = [...new Set(body.classIds)].filter((id) => !ownedIds.has(id))
  if (foreign.length) throw createError({ statusCode: 400, statusMessage: 'Ada kelas yang bukan milik organisasi Anda' })

  const existing = await db.query.examEventClasses.findMany({ where: eq(examEventClasses.eventId, eventId) })
  const existingIds = new Set(existing.map((c) => c.classId))
  const newIds = [...new Set(body.classIds)].filter((id) => !existingIds.has(id))
  if (!newIds.length) return { data: { added: 0, sessions: 0 } }
  await db.insert(examEventClasses).values(newIds.map((classId) => ({ eventId, classId })))

  // Buat sesi (mapel × kelas) untuk mapel yang sudah punya sesi
  const subjects = await db.query.examEventSubjects.findMany({ where: eq(examEventSubjects.eventId, eventId) })
  const existingSessions = await db.query.examSessions.findMany({
    where: and(eq(examSessions.eventId, eventId), inArray(examSessions.classId, newIds)),
  })
  const existingKeys = new Set(existingSessions.map((s) => `${s.eventSubjectId}:${s.classId}`))
  const sesiList = await db.query.examSesi.findMany({ where: eq(examSesi.eventId, eventId) })
  const sesiMap = new Map(sesiList.map((s) => [s.id, s]))

  const rows = []
  for (const subj of subjects) {
    const sesi = subj.sesiId ? sesiMap.get(subj.sesiId) : null
    if (!sesi) continue
    for (const classId of newIds) {
      if (existingKeys.has(`${subj.id}:${classId}`)) continue
      rows.push({
        id: crypto.randomUUID(),
        eventId,
        eventSubjectId: subj.id,
        sesiId: sesi.id,
        classId,
        openAt: sesi.openAt,
        closeAt: sesi.closeAt,
        durationMinutes: subj.durationMinutes,
        status: 'draft' as const,
      })
    }
  }
  if (rows.length) await db.insert(examSessions).values(rows)
  return { data: { added: newIds.length, sessions: rows.length } }
})
