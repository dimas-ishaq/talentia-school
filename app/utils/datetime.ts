// ============================================================
// Helper tanggal & waktu.
// Zona waktu default dapat dikonfigurasi oleh admin (pengaturan
// "school.timezone"). Selalu ditampilkan/diinput format 24 jam
// agar tidak bergantung locale browser (AM/PM).
// ============================================================

import { DEFAULT_TIMEZONE, TIMEZONE_OPTIONS, isKnownTimezone, timezoneOffset as offsetOf } from '~~/shared/timezone'

export { DEFAULT_TIMEZONE, TIMEZONE_OPTIONS }

let activeTimezone: string = DEFAULT_TIMEZONE
let activeTimeFormat: '12' | '24' = '24'

/** Set zona waktu aktif (dipanggil dari plugin setelah memuat pengaturan). */
export function setActiveTimezone(tz: string | null | undefined) {
  activeTimezone = isKnownTimezone(tz) ? tz : DEFAULT_TIMEZONE
}

export function setActiveTimeFormat(format: string | null | undefined) {
  activeTimeFormat = format === '12' ? '12' : '24'
}

export function getActiveTimeFormat(): '12' | '24' {
  return activeTimeFormat
}

/** Zona waktu aktif saat ini. */
export function getActiveTimezone(): string {
  return activeTimezone
}

/** Offset UTC (mis. "+07:00") untuk zona waktu tertentu. */
export function timezoneOffset(tz: string = activeTimezone): string {
  return offsetOf(tz)
}

/** Label pendek zona waktu (WIB/WITA/WIT). */
export function timezoneShortLabel(tz: string = activeTimezone): string {
  return tz === 'Asia/Makassar' ? 'WITA' : tz === 'Asia/Jayapura' ? 'WIT' : 'WIB'
}

/** Format input yang dipakai di form: "YYYY-MM-DD HH:mm" (24 jam). */
const INPUT_RE = /^\d{4}-\d{2}-\d{2} ([01]\d|2[0-3]):[0-5]\d$/

/** Pola untuk atribut `pattern` pada <input>. */
export const JAKARTA_INPUT_PATTERN = '\\d{4}-\\d{2}-\\d{2} [0-2]\\d:[0-5]\\d'

export function isValidJakartaInput(value: string | null | undefined): boolean {
  return !!value && INPUT_RE.test(value.trim())
}

/**
 * Ubah ISO/Date apa pun menjadi string input "YYYY-MM-DD HH:mm"
 * pada zona waktu aktif. Dipakai saat mengisi (prefill) form.
 */
export function toJakartaInput(value: string | Date | null | undefined, tz: string = activeTimezone): string {
  if (!value) return ''
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(d)
  const p: Record<string, string> = {}
  for (const { type, value: v } of parts) p[type] = v
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`
}

/**
 * Ubah string input "YYYY-MM-DD HH:mm" (zona waktu aktif) menjadi
 * ISO UTC untuk dikirim/disimpan ke server.
 */
export function fromJakartaInput(value: string, tz: string = activeTimezone): string {
  return new Date(`${value.trim().replace(' ', 'T')}:00${timezoneOffset(tz)}`).toISOString()
}

/**
 * Format tampilan 24 jam, contoh: "24 Sep 2026, 13.30".
 */
export function formatJakartaDateTime(
  value: string | Date | null | undefined,
  fallback = '-',
  tz: string = activeTimezone,
): string {
  if (!value) return fallback
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return fallback
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: tz,
    dateStyle: 'medium',
    timeStyle: 'short',
    hour12: activeTimeFormat === '12',
  }).format(d)
}
