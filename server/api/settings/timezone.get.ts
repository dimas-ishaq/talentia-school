import { and, eq } from 'drizzle-orm'
import { settings } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { DEFAULT_TIMEZONE, TIMEZONE_OPTIONS } from '~~/shared/timezone.ts'
import { requireOrganization } from '~~/server/utils/tenant'

// Endpoint publik (tanpa auth): dipakai klien untuk memuat zona waktu sekolah
// agar input/tampilan tanggal-jam konsisten.
export default defineEventHandler(async (event) => {
  const { organization } = await requireOrganization(event)
  const rows = await db
    .select({ key: settings.key, value: settings.value })
    .from(settings)
    .where(and(eq(settings.organizationId, organization.id), eq(settings.key, 'school.timezone')))

  const timezone = rows.find((row) => row.key === 'school.timezone')?.value
  const [formatRow] = await db.select({ value: settings.value }).from(settings).where(and(eq(settings.organizationId, organization.id), eq(settings.key, 'school.time_format'))).limit(1)
  const value = timezone && TIMEZONE_OPTIONS.some((o) => o.value === timezone) ? timezone : DEFAULT_TIMEZONE

  return { data: { timezone: value, timeFormat: formatRow?.value === '12' ? '12' : '24' } }
})
