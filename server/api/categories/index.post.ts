// server/api/categories/index.post.ts
import { db } from '~~/server/utils/db'
import { categories as cats } from '~~/server/database/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { requireAdmin } from '~~/server/utils/requireAdmin'

const schema = z.object({
  name: z.string().trim().min(1, 'Nama kategori wajib').max(100),
  parentId: z.string().nullable().optional(),
  position: z.number().int().min(0).optional(),
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = schema.parse(await readBody(event))

  // Cek nama unik
  const existing = await db.query.categories.findFirst({
    where: eq(cats.name, body.name),
    columns: { id: true },
  })
  if (existing) throw createError({ statusCode: 409, statusMessage: `Nama "${body.name}" sudah ada` })

  // Cek parentId valid
  if (body.parentId) {
    const parent = await db.query.categories.findFirst({
      where: eq(cats.id, body.parentId),
      columns: { id: true },
    })
    if (!parent) throw createError({ statusCode: 404, statusMessage: 'Induk kategori tidak ditemukan' })
  }

  const id = crypto.randomUUID()
  await db.insert(cats).values({
    id,
    name: body.name,
    parentId: body.parentId || null,
    position: body.position ?? 0,
  })

  return { success: true, id }
})