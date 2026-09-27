import { and, eq, inArray } from 'drizzle-orm'
import { attendance, courseClasses, courseTeachers, courses, teachers } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

/**
 * Ambil semua pasangan (classId, subjectId) yang boleh diakses user.
 * - Admin : null  → berarti SEMUA kelas & mapel.
 * - Guru  : dari course yang diampu (course punya subjectId + daftar kelas).
 */
export async function allowedAttendanceScopes(event: Parameters<typeof requireUserSession>[0]) {
  const { user } = await requireUserSession(event)
  if (user.role === 'admin') return null
  if (user.role !== 'teacher') throw createError({ statusCode: 403, statusMessage: 'Akses absensi ditolak' })

  const teacher = await db.query.teachers.findFirst({ where: eq(teachers.userId, user.id), columns: { id: true } })
  if (!teacher) throw createError({ statusCode: 404, statusMessage: 'Profil guru tidak ditemukan' })

  const courseRows = await db
    .select({ courseId: courseTeachers.courseId, subjectId: courses.subjectId })
    .from(courseTeachers)
    .innerJoin(courses, eq(courseTeachers.courseId, courses.id))
    .where(eq(courseTeachers.teacherId, teacher.id))

  const courseIds = courseRows.map((r) => r.courseId)
  if (!courseIds.length) return []

  const subjectByCourse = new Map(courseRows.map((r) => [r.courseId, r.subjectId]))
  const classRows = await db
    .select({ courseId: courseClasses.courseId, classId: courseClasses.classId })
    .from(courseClasses)
    .where(inArray(courseClasses.courseId, courseIds))

  const scopes = new Map<string, { classId: string; subjectId: string }>()
  for (const row of classRows) {
    const subjectId = subjectByCourse.get(row.courseId)
    if (!subjectId) continue
    scopes.set(`${row.classId}|${subjectId}`, { classId: row.classId, subjectId })
  }
  return [...scopes.values()]
}

/** Cek hak akses untuk satu pasangan kelas + mapel. */
export async function requireAttendanceAccess(
  event: Parameters<typeof requireUserSession>[0],
  classId?: string,
  subjectId?: string,
) {
  const { user } = await requireUserSession(event)
  if (user.role === 'admin') return user
  if (user.role !== 'teacher') throw createError({ statusCode: 403, statusMessage: 'Akses absensi ditolak' })
  if (!classId || !subjectId) return user

  const scopes = await allowedAttendanceScopes(event)
  const ok = scopes?.some((s) => s.classId === classId && s.subjectId === subjectId)
  if (!ok) throw createError({ statusCode: 403, statusMessage: 'Anda tidak mengampu mapel ini di kelas tersebut' })
  return user
}

export async function requireAttendanceRecordAccess(event: Parameters<typeof requireUserSession>[0], id: string) {
  const row = await db.query.attendance.findFirst({
    where: eq(attendance.id, id),
    columns: { classId: true, subjectId: true },
  })
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Absensi tidak ditemukan' })
  const { user } = await requireUserSession(event)
  // Data lama tanpa mapel tetap terlihat sebagai histori, tetapi tidak boleh diedit guru.
  if (user.role !== 'admin' && !row.subjectId) throw createError({ statusCode: 403, statusMessage: 'Data absensi lama hanya dapat diubah admin' })
  await requireAttendanceAccess(event, row.classId, row.subjectId ?? undefined)
}
