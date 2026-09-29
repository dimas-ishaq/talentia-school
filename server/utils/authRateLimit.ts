import type { H3Event } from 'h3'

const buckets = new Map<string, { count: number; resetAt: number }>()
let lastCleanup = 0

export function authRateLimitKey(event: H3Event) {
  return getRequestIP(event, { xForwardedFor: true }) || 'unknown'
}

export function enforceAuthRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now()
  if (now - lastCleanup > 5 * 60_000) {
    for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k)
    lastCleanup = now
  }
  const current = buckets.get(key)
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return
  }
  if (current.count >= limit) throw createError({ statusCode: 429, statusMessage: 'Terlalu banyak permintaan. Coba lagi nanti.' })
  current.count++
}
