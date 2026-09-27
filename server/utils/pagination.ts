// server/utils/pagination.ts
// Normalisasi perPage agar selalu kelipatan `step` (default 50).
// Contoh: 50 → 50, 100 → 100, 130 → 100, 9999 → max.
export function normalizePerPage(raw: unknown, step = 50, max = 500): number {
  const n = Number(raw)
  if (!Number.isFinite(n) || n < step) return step
  const multiples = Math.floor(n / step)
  return Math.min(Math.max(multiples, 1) * step, max)
}
