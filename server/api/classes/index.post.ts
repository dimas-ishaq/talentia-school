// server/api/classes/index.post.ts
import { db } from '~~/server/utils/db'
import { classes } from '~~/server/database/schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { requireOrganizationAdmin } from '~~/server/utils/tenant'

const schema = z.object({
  name: z.string().min(1, 'Nama kelas wajib diisi').max(50),
  level: z.coerce.number().int().min(1, 'Level minimal 1').max(12, 'Level maksimal 12'),
  teacherId: z.string().optional().nullable(),
})

export default defineEventHandler(async (event) => {
  const { organization } = await requireOrganizationAdmin(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message ?? 'Data tidak valid',
    })
  }

  const { name, level, teacherId } = parsed.data

  // Cek duplikat nama kelas
  const existing = await db.query.classes.findFirst({
    where: and(eq(classes.name, name.trim()), eq(classes.organizationId, organization.id)),
    columns: { id: true },
  })
  if (existing) {
    throw createError({
      statusCode: 409,
      statusMessage: `Kelas "${name}" sudah ada`,
    })
  }

  const [created] = await db
    .insert(classes)
    .values({
      id: crypto.randomUUID(),
      organizationId: organization.id,
      name: name.trim(),
      level,
      teacherId: teacherId || null,
    })
    .returning()

  return { success: true, data: created }
})