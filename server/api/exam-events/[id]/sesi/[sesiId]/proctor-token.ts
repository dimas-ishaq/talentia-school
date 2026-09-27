// GET  /api/exam-events/[id]/sesi/[sesiId]/proctor-token — token proktor + countdown (admin)
// POST — regenerate manual (admin)
import { eq } from 'drizzle-orm'
import { examSesi } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireExamManager, ensureProctorToken, generateToken, hashToken, PROCTOR_TOKEN_ROTATION_MINUTES } from '~~/server/utils/exam'

export default defineEventHandler(async (event) => {
  const eventId = String(getRouterParam(event, 'id') ?? '')
  const sesiId = String(getRouterParam(event, 'sesiId') ?? '')
  await requireExamManager(event, eventId)
  const { user } = await requireUserSession(event)
  if (user.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Hanya admin' })

  let sesi = await db.query.examSesi.findFirst({ where: eq(examSesi.id, sesiId) })
  if (!sesi || sesi.eventId !== eventId) throw createError({ statusCode: 404, statusMessage: 'Sesi tidak ditemukan' })

  if (getMethod(event) === 'POST') {
    const token = generateToken()
    await db.update(examSesi).set({
      proctorTokenPreviousPlain: sesi.proctorTokenPlain,
      proctorTokenPlain: token,
      proctorTokenHash: await hashToken(token),
      proctorTokenNextRotationAt: new Date(Date.now() + PROCTOR_TOKEN_ROTATION_MINUTES * 60_000),
    }).where(eq(examSesi.id, sesiId))
    sesi = (await db.query.examSesi.findFirst({ where: eq(examSesi.id, sesiId) }))!
  } else {
    // Rotasi lazy jika sudah lewat
    const fresh = await ensureProctorToken(sesiId, sesi)
    if (fresh) sesi = (await db.query.examSesi.findFirst({ where: eq(examSesi.id, sesiId) }))!
  }

  const nextRotationAt = sesi.proctorTokenNextRotationAt ? new Date(sesi.proctorTokenNextRotationAt).getTime() : null
  return {
    data: {
      token: sesi.proctorTokenPlain,
      secondsUntilRotation: nextRotationAt ? Math.max(0, Math.floor((nextRotationAt - Date.now()) / 1000)) : null,
      rotationMinutes: PROCTOR_TOKEN_ROTATION_MINUTES,
      graceMinutes: sesi.proctorTokenGraceMinutes ?? 2,
    },
  }
})
