// server/utils/calendar.ts (updated with exports for frontend)
// Helper bersama untuk fitur Kalender Akademik: metadata jenis agenda,
// validasi tanggal, dan util tanggal (tanpa dependensi eksternal).
export const CALENDAR_EVENT_TYPES = [
  'exam',
  'holiday',
  'activity',
  'meeting',
  'competition',
  'semester_start',
  'semester_end',
  'break',
  'other',
] as const

export type CalendarEventTypeKey = typeof CALENDAR_EVENT_TYPES[number]

export interface CalendarEventTypeMeta {
  label: string
  color: string      // warna default (hex) untuk kalender
  icon: string       // ikon heroicons
  isHoliday: boolean // default menandai hari libur
}

export const EVENT_TYPE_META: Record<CalendarEventTypeKey, CalendarEventTypeMeta> = {
  exam:           { label: 'Ujian / Asesmen',   color: '#ef4444', icon: 'heroicons:beaker',                   isHoliday: false },
  holiday:        { label: 'Hari Libur',        color: '#f43f5e', icon: 'heroicons:sun',                      isHoliday: true },
  activity:       { label: 'Kegiatan Sekolah',  color: '#10b981', icon: 'heroicons:sparkles',                 isHoliday: false },
  meeting:        { label: 'Rapat / Raker',     color: '#6366f1', icon: 'heroicons:user-group',               isHoliday: false },
  competition:    { label: 'Lomba / Kompetisi', color: '#f59e0b', icon: 'heroicons:trophy',                   isHoliday: false },
  semester_start: { label: 'Awal Semester',     color: '#0ea5e9', icon: 'heroicons:play-circle',              isHoliday: false },
  semester_end:   { label: 'Akhir Semester',    color: '#8b5cf6', icon: 'heroicons:flag',                     isHoliday: false },
  break:          { label: 'Libur Semester',    color: '#14b8a6', icon: 'heroicons:academic-cap',             isHoliday: true },
  other:          { label: 'Lainnya',           color: '#64748b', icon: 'heroicons:calendar-days',            isHoliday: false },
}

/** Validasi format tanggal ISO (YYYY-MM-DD) dan keberadaannya di kalender. */
export function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const d = new Date(`${value}T00:00:00`)
  return !Number.isNaN(d.getTime()) && value === d.toISOString().slice(0, 10)
}
