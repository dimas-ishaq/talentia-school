// server/utils/categoryVisibility.ts
// Helper visibilitas kategori bertingkat.
// Aturan: jika sebuah kategori disembunyikan (isVisible=false), maka semua
// keturunannya (anak, cucu, dst) juga dianggap tersembunyi.
import { eq } from 'drizzle-orm'
import { categories } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

/** Semua id kategori yang efektif tersembunyi (dirinya sendiri atau leluhurnya disembunyikan). */
export async function getHiddenCategoryIds(): Promise<Set<string>> {
  const rows = await db
    .select({ id: categories.id, parentId: categories.parentId, isVisible: categories.isVisible })
    .from(categories)

  const byId = new Map(rows.map((row) => [row.id, row]))
  const hidden = new Set<string>()

  const isHidden = (id: string): boolean => {
    if (hidden.has(id)) return true
    const row = byId.get(id)
    if (!row) return false
    if (!row.isVisible) {
      hidden.add(id)
      return true
    }
    if (row.parentId && isHidden(row.parentId)) {
      hidden.add(id)
      return true
    }
    return false
  }

  for (const row of rows) isHidden(row.id)
  return hidden
}

/** Semua id keturunan (anak, cucu, dst) dari sebuah kategori. */
export async function getDescendantCategoryIds(id: string): Promise<string[]> {
  const rows = await db
    .select({ id: categories.id, parentId: categories.parentId })
    .from(categories)

  const childrenByParent = new Map<string, string[]>()
  for (const row of rows) {
    if (!row.parentId) continue
    const list = childrenByParent.get(row.parentId) ?? []
    list.push(row.id)
    childrenByParent.set(row.parentId, list)
  }

  const result: string[] = []
  const stack = [...(childrenByParent.get(id) ?? [])]
  while (stack.length) {
    const current = stack.pop()!
    result.push(current)
    stack.push(...(childrenByParent.get(current) ?? []))
  }
  return result
}

/** Apakah sebuah kategori efektif terlihat (tidak ada leluhur yang disembunyikan). */
export async function isCategoryVisible(id: string | null | undefined): Promise<boolean> {
  if (!id) return true
  const hidden = await getHiddenCategoryIds()
  return !hidden.has(id)
}

/** Ambil id induk sebuah kategori. */
export async function getCategoryParentId(id: string): Promise<string | null> {
  const row = await db.query.categories.findFirst({
    where: eq(categories.id, id),
    columns: { parentId: true },
  })
  return row?.parentId ?? null
}
