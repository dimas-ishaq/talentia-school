// ============================================================
// Konstanta zona waktu sekolah — dipakai bersama oleh server & klien.
// ============================================================

export const DEFAULT_TIMEZONE = 'Asia/Jakarta'

export const TIMEZONE_OPTIONS = [
  { value: 'Asia/Jakarta', label: 'WIB — Indonesia Barat (Jakarta)', offset: '+07:00', short: 'WIB' },
  { value: 'Asia/Makassar', label: 'WITA — Indonesia Tengah (Makassar)', offset: '+08:00', short: 'WITA' },
  { value: 'Asia/Jayapura', label: 'WIT — Indonesia Timur (Jayapura)', offset: '+09:00', short: 'WIT' },
] as const

export type TimezoneValue = (typeof TIMEZONE_OPTIONS)[number]['value']

export function isKnownTimezone(value: unknown): value is TimezoneValue {
  return typeof value === 'string' && TIMEZONE_OPTIONS.some((o) => o.value === value)
}

export function timezoneOffset(tz: string): string {
  return TIMEZONE_OPTIONS.find((o) => o.value === tz)?.offset ?? '+07:00'
}

export function timezoneShortLabel(tz: string): string {
  return TIMEZONE_OPTIONS.find((o) => o.value === tz)?.short ?? 'WIB'
}
