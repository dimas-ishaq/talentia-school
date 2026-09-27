// server/api/categories/index.get.ts
// GET /api/categories — daftar kategori (bertingkat)
// Admin lihat semua. Role lain lihat yg isVisible=true saja.
import { db } from '~~/server/utils/db'
import { categories as cats } from '~~/server/database/schema'
import { asc, eq, and } from 'drizzle-orm'
import { getHiddenCategoryIds } from '~~/server/utils/categoryVisibility'
import { requireOrganization } from '~~/server/utils/tenant'

export default defineEventHandler(async (event) => {
  const { user, organization } = await requireOrganization(event)
  const isAdmin = ['admin', 'org_admin', 'owner'].includes(user.role)

  // Ambil semua dulu, parent diurutkan, lalu children dikelompokkan client-side
  const orgFilter = eq(cats.organizationId, organization.id)
  const whereClause = isAdmin ? orgFilter : and(orgFilter, eq(cats.isVisible, true))

  const rows = await db
    .select({
      id: cats.id,
      name: cats.name,
      parentId: cats.parentId,
      position: cats.position,
      isVisible: cats.isVisible,
      createdAt: cats.createdAt,
    })
    .from(cats)
    .where(whereClause)
    .orderBy(asc(cats.position), asc(cats.name))

  // Role non-admin: sembunyikan kategori yang leluhurnya disembunyikan
  // (jaga-jaga untuk data lama yang belum tersinkron cascade).
  if (!isAdmin) {
    const hidden = await getHiddenCategoryIds()
    return { data: rows.filter((row) => !hidden.has(row.id)) }
  }

  return { data: rows }
})