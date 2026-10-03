import { db } from '~~/server/utils/db'
import { categories as cats } from '~~/server/database/schema'
import { and, eq, inArray, ne } from 'drizzle-orm'
import { z } from 'zod'
import { requireOrganizationAdmin } from '~~/server/utils/tenant'
import { getDescendantCategoryIds } from '~~/server/utils/categoryVisibility'

const schema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  parentId: z.string().nullable().optional(),
  position: z.number().int().min(0).optional(),
  isVisible: z.boolean().optional(),
})

export default defineEventHandler(async (event) => {
  const { organization } = await requireOrganizationAdmin(event)
  const id = getRouterParam(event, 'id')!
  const body = schema.parse(await readBody(event))
  const scoped = and(eq(cats.id, id), eq(cats.organizationId, organization.id))
  const current = await db.query.categories.findFirst({ where: scoped })
  if (!current) throw createError({ statusCode: 404, statusMessage: 'Kategori tidak ditemukan' })

  if (body.name && body.name !== current.name) {
    const duplicate = await db.query.categories.findFirst({
      where: and(eq(cats.organizationId, organization.id), eq(cats.name, body.name), ne(cats.id, id)),
      columns: { id: true },
    })
    if (duplicate) throw createError({ statusCode: 409, statusMessage: `Nama "${body.name}" sudah ada` })
  }

  if (body.parentId === id) throw createError({ statusCode: 400, statusMessage: 'Kategori tidak boleh menjadi induknya sendiri' })
  if (body.parentId) {
    const parent = await db.query.categories.findFirst({ where: and(eq(cats.id, body.parentId), eq(cats.organizationId, organization.id)), columns: { id: true } })
    if (!parent) throw createError({ statusCode: 404, statusMessage: 'Induk kategori tidak ditemukan' })
  }

  const updateData: Record<string, unknown> = {}
  if (body.name !== undefined) updateData.name = body.name
  if (body.parentId !== undefined) updateData.parentId = body.parentId
  if (body.position !== undefined) updateData.position = body.position
  if (body.isVisible !== undefined) updateData.isVisible = body.isVisible
  await db.update(cats).set(updateData).where(scoped)

  // Hide/show parent cascades to every descendant. Showing a child never
  // overrides a hidden ancestor; effective visibility remains inherited.
  if (body.isVisible !== undefined) {
    const descendants = await getDescendantCategoryIds(id)
    if (descendants.length) {
      await db.update(cats).set({ isVisible: body.isVisible }).where(inArray(cats.id, descendants))
    }
  }
  return { success: true }
})