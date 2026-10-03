// server/api/categories/[id].delete.ts
// DELETE: reparent children to deleted category's parent, set course categoryId = null
import { db } from '~~/server/utils/db'
import { categories as cats, courses } from '~~/server/database/schema'

import { and, eq } from 'drizzle-orm'
import { requireOrganizationAdmin } from '~~/server/utils/tenant'

export default defineEventHandler(async (event) => {
  const { organization } = await requireOrganizationAdmin(event)
  const id = getRouterParam(event, 'id')!
  const cat = await db.query.categories.findFirst({ where: and(eq(cats.id, id), eq(cats.organizationId, organization.id)) })
  if (!cat) throw createError({ statusCode: 404, statusMessage: 'Kategori tidak ditemukan' })

  // Reparent children
  if (cat.parentId) {
    await db.update(cats).set({ parentId: cat.parentId }).where(eq(cats.parentId, id))
  } else {
    await db.update(cats).set({ parentId: null }).where(eq(cats.parentId, id))
  }

  // Unset course categoryId
  await db.update(courses).set({ categoryId: null }).where(and(eq(courses.categoryId, id), eq(courses.organizationId, organization.id)))

  await db.delete(cats).where(and(eq(cats.id, id), eq(cats.organizationId, organization.id)))
  return { success: true }
})