// server/api/subjects/index.post.ts
// POST /api/subjects — tambah 1 mapel baru.
// Polanya sama dengan classes/index.post.ts: validasi zod → cek duplikat → insert.
import { db } from '~~/server/utils/db'
import { subjects } from '~~/server/database/schema'
import { eq, or, and } from 'drizzle-orm'
import { z } from 'zod'
import { requireOrganizationAdmin } from '~~/server/utils/tenant'

const schema = z.object({
  code: z.string().min(1, 'Kode mapel wajib diisi').max(10, 'Kode maksimal 10 karakter'),
  name: z.string().min(1, 'Nama mapel wajib diisi').max(50, 'Nama maksimal 50 karakter'),
  description: z.string().max(255, 'Deskripsi maksimal 255 karakter').optional().default(''),
})

export default defineEventHandler(async (event) => {
  const { organization } = await requireOrganizationAdmin(event)
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

  // Kode ATAU nama tidak boleh kembar
  const existing = await db.query.subjects.findFirst({
    where: and(eq(subjects.organizationId, organization.id), or(eq(subjects.code, code), eq(subjects.name, name))),
    columns: { id: true },
  })
  if (existing) {
    throw createError({
      statusCode: 409,
      statusMessage: `Kode "${code}" atau nama "${name}" sudah dipakai`,
    })
  }

  const [created] = await db
    .insert(subjects)
    .values({
      id: crypto.randomUUID(),
      organizationId: organization.id,
      code,
      name,
      description: parsed.data.description.trim() || null,
    })
    .returning()

  return { success: true, data: created }
})
