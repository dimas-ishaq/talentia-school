// server/utils/schedule.ts
// Helper bersama untuk fitur jadwal: nama hari, validasi jam, dan deteksi bentrok.
import { and, eq, ne } from 'drizzle-orm'
import { scheduleEntries } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

export const DAY_NAMES: Record<number, string> = {
  1: 'Senin',
  2: 'Selasa',
  3: 'Rabu',
  4: 'Kamis',
  5: 'Jumat',
  6: 'Sabtu',
}

/** "07:30" → 450 (menit sejak tengah malam). Return null bila format salah. */
export function timeToMinutes(time: string): number | null {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time)
  if (!m) return null
  return Number(m[1]) * 60 + Number(m[2])
}

/**
 * Cek bentrok jadwal: hari sama + jam tumpang tindih +
 * (guru sama ATAU kelas sama). Mengabaikan baris nonaktif & dirinya sendiri.
 * Mengembalikan pesan error bila bentrok, atau null bila aman.
 */
export async function findScheduleConflict(params: {
  dayOfWeek: number
  startTime: string
  endTime: string
  teacherId: string | null
  classId: string
  excludeId?: string
  organizationId: string
}): Promise<string | null> {
  const start = timeToMinutes(params.startTime)
  const end = timeToMinutes(params.endTime)
  if (start === null || end === null) return null // biar validasi format yang menangani

  const rows = await db
    .select({
      id: scheduleEntries.id,
      startTime: scheduleEntries.startTime,
      endTime: scheduleEntries.endTime,
      teacherId: scheduleEntries.teacherId,
      classId: scheduleEntries.classId,
    })
    .from(scheduleEntries)
    .where(
      and(
        eq(scheduleEntries.dayOfWeek, params.dayOfWeek),
        eq(scheduleEntries.isActive, true),
        eq(scheduleEntries.organizationId, params.organizationId),
        params.excludeId ? ne(scheduleEntries.id, params.excludeId) : undefined,
      ),
    )

  for (const row of rows) {
    const rowStart = timeToMinutes(row.startTime)
    const rowEnd = timeToMinutes(row.endTime)
    if (rowStart === null || rowEnd === null) continue

    // Tumpang tindih bila start < rowEnd DAN end > rowStart
    const overlap = start < rowEnd && end > rowStart
    if (!overlap) continue

    if (row.classId === params.classId) {
      return `Bentrok dengan jadwal kelas yang sama pada jam ${row.startTime}-${row.endTime}`
    }
    if (params.teacherId && row.teacherId === params.teacherId) {
      return `Guru sudah mengajar di jam ${row.startTime}-${row.endTime}`
    }
  }
  return null
}
