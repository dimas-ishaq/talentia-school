// server/api/classes/[id].patch.ts
import { db } from '~~/server/utils/db'
import { classes } from '~~/server/database/schema'
import { eq, and, ne } from 'drizzle-orm'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1).max(50),
  level: z.coerce.number().int().min(1).max(12),
  teacherId: z.string().optional().nullable(),
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID tidak valid' })

  const body = await readBody(event)
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message ?? 'Data tidak valid',
    })
  }

  const { name, level, teacherId } = parsed.data

  // Cek duplikat nama (selain dirinya sendiri)
  const existing = await db.query.classes.findFirst({
    where: and(eq(classes.name, name.trim()), ne(classes.id, id)),
    columns: { id: true },
  })
  if (existing) {
    throw createError({
      statusCode: 409,
      statusMessage: `Kelas "${name}" sudah ada`,
    })
  }

  const [updated] = await db
    .update(classes)
    .set({
      name: name.trim(),
      level,
      teacherId: teacherId || null,
    })
    .where(eq(classes.id, id))
    .returning()

  if (!updated) {
    throw createError({ statusCode: 404, statusMessage: 'Kelas tidak ditemukan' })
  }

  return { success: true, data: updated }
})