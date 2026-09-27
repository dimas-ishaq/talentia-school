import { and, eq } from 'drizzle-orm'
import { settings } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

export const DEFAULT_UPLOAD_MAX_MB = 10

export async function getUploadMaxBytes(organizationId?: string | null) {
  const where = organizationId
    ? and(eq(settings.key, 'upload.max_size_mb'), eq(settings.organizationId, organizationId))
    : eq(settings.key, 'upload.max_size_mb')
  const [setting] = await db.select({ value: settings.value }).from(settings).where(where).limit(1)
  const mb = Number(setting?.value)
  return (Number.isInteger(mb) && mb >= 1 && mb <= 100 ? mb : DEFAULT_UPLOAD_MAX_MB) * 1024 * 1024
}
