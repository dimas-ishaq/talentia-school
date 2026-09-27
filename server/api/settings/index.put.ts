import { z } from 'zod'
import { settings } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireOrganizationAdmin } from '~~/server/utils/tenant'
import { isKnownTimezone } from '~~/shared/timezone.ts'

const bodySchema = z.object({
  items: z.array(
    z.object({
      key: z.string().trim().min(1, 'Key tidak boleh kosong').max(100, 'Key maksimal 100 karakter'),
      value: z.string().max(5000, 'Nilai maksimal 5000 karakter'),
    }),
  ),
})

export default defineEventHandler(async (event) => {
  const { organization } = await requireOrganizationAdmin(event)
  const { items } = bodySchema.parse(await readBody(event))
  const timezone = items.find((item) => item.key === 'school.timezone')
  if (timezone && !isKnownTimezone(timezone.value)) {
    throw createError({ statusCode: 400, statusMessage: 'Zona waktu regional tidak valid' })
  }
  const timeFormat = items.find((item) => item.key === 'school.time_format')
  if (timeFormat && !['12', '24'].includes(timeFormat.value)) {
    throw createError({ statusCode: 400, statusMessage: 'Format waktu harus 12 atau 24 jam' })
  }
  const uploadMaxMb = items.find((item) => item.key === 'upload.max_size_mb')
  if (uploadMaxMb) {
    const mb = Number(uploadMaxMb.value)
    if (!Number.isInteger(mb) || mb < 1 || mb > 100) {
      throw createError({ statusCode: 400, statusMessage: 'Batas ukuran upload harus bilangan bulat 1–100 MB' })
    }
  }

  db.transaction((tx) => {
    for (const item of items) {
      tx
        .insert(settings)
        .values({ key: item.key, organizationId: organization.id, value: item.value })
        .onConflictDoUpdate({
          target: settings.key,
          set: { organizationId: organization.id, value: item.value, updatedAt: new Date() },
          // Existing SQLite databases still use key as the primary key.
        })
        .run()
    }
  })

  return { success: true }
})
