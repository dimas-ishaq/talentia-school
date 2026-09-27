// server/api/subjects/[id].patch.ts
// PATCH /api/subjects/:id — ubah 1 mapel.
// Polanya sama dengan classes/[id].patch.ts.
import { db } from '~~/server/utils/db'
import { subjects } from '~~/server/database/schema'
import { eq, and, ne, or } from 'drizzle-orm'
import { z } from 'zod'
import { requireAdmin } from '~~/server/utils/requireAdmin'

const schema = z.object({
  code: z.string().min(1, 'Kode mapel wajib diisi').max(10, 'Kode maksimal 10 karakter'),
  name: z.string().min(1, 'Nama mapel wajib diisi').max(50, 'Nama maksimal 50 karakter'),
  description: z.string().max(255, 'Deskripsi maksimal 255 karakter').optional().default(''),
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
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

  const code = parsed.data.code.trim().toUpperCase()
  const name = parsed.data.name.trim()

  // Cek duplikat kode/nama milik mapel LAIN (dirinya sendiri dikecualikan)
  const existing = await db.query.subjects.findFirst({
    where: and(or(eq(subjects.code, code), eq(subjects.name, name)), ne(subjects.id, id)),
    columns: { id: true },
  })
  if (existing) {
    throw createError({
      statusCode: 409,
      statusMessage: `Kode "${code}" atau nama "${name}" sudah dipakai mapel lain`,
    })
  }

  const [updated] = await db
    .update(subjects)
    .set({
      code,
      name,
      description: parsed.data.description.trim() || null,
    })
    .where(eq(subjects.id, id))
    .returning()

  if (!updated) {
    throw createError({ statusCode: 404, statusMessage: 'Mata pelajaran tidak ditemukan' })
  }

  return { success: true, data: updated }
})
