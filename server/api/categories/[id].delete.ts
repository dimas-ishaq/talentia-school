// server/api/categories/[id].delete.ts
// DELETE: reparent children to deleted category's parent, set course categoryId = null
import { db } from '~~/server/utils/db'
import { categories as cats, courses } from '~~/server/database/schema'
import { eq } from 'drizzle-orm'
import { requireAdmin } from '~~/server/utils/requireAdmin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')!
  const cat = await db.query.categories.findFirst({ where: eq(cats.id, id) })
  if (!cat) throw createError({ statusCode: 404, statusMessage: 'Kategori tidak ditemukan' })

  // Reparent children
  if (cat.parentId) {
    await db.update(cats).set({ parentId: cat.parentId }).where(eq(cats.parentId, id))
  } else {
    await db.update(cats).set({ parentId: null }).where(eq(cats.parentId, id))
  }

  // Unset course categoryId
  await db.update(courses).set({ categoryId: null }).where(eq(courses.categoryId, id))

  await db.delete(cats).where(eq(cats.id, id))
  return { success: true }
})