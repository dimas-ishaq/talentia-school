// server/api/categories/index.post.ts
import { db } from '~~/server/utils/db'
import { categories as cats } from '~~/server/database/schema'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { requireOrganizationAdmin } from '~~/server/utils/tenant'

const schema = z.object({
  name: z.string().trim().min(1, 'Nama kategori wajib').max(100),
  parentId: z.string().nullable().optional(),
  position: z.number().int().min(0).optional(),
})

export default defineEventHandler(async (event) => {
  const { organization } = await requireOrganizationAdmin(event)
  const body = schema.parse(await readBody(event))

  // Cek nama unik
  const existing = await db.query.categories.findFirst({
    where: and(eq(cats.organizationId, organization.id), eq(cats.name, body.name)),
    columns: { id: true },
  })
  if (existing) throw createError({ statusCode: 409, statusMessage: `Nama "${body.name}" sudah ada` })

  // Cek parentId valid
  if (body.parentId) {
    const parent = await db.query.categories.findFirst({
      where: and(eq(cats.id, body.parentId), eq(cats.organizationId, organization.id)),
      columns: { id: true },
    })
    if (!parent) throw createError({ statusCode: 404, statusMessage: 'Induk kategori tidak ditemukan' })
  }

  const id = crypto.randomUUID()
  await db.insert(cats).values({
    id,
    organizationId: organization.id,
    name: body.name,
    parentId: body.parentId || null,
    position: body.position ?? 0,
  })

  return { success: true, id }
})