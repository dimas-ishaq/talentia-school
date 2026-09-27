import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { organizations } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireOrganizationAdmin } from '~~/server/utils/tenant'

const bodySchema = z.object({
  name: z.string().trim().min(2, 'Nama sekolah minimal 2 karakter').max(120),
})

export default defineEventHandler(async (event) => {
  const { organization } = await requireOrganizationAdmin(event)
  const { name } = bodySchema.parse(await readBody(event))
  const [updated] = await db.update(organizations).set({ name }).where(eq(organizations.id, organization.id)).returning({ id: organizations.id, name: organizations.name, slug: organizations.slug, status: organizations.status })
  if (!updated) throw createError({ statusCode: 404, statusMessage: 'Organisasi tidak ditemukan' })
  return { data: updated }
})
