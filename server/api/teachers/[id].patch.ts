// server/api/teachers/[id].patch.ts
import { and, eq, ne } from 'drizzle-orm'
import { z } from 'zod'
import { teachers, users } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireOrganizationAdmin } from '~~/server/utils/tenant'

const updateTeacherSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi').max(100),
  code: z.string().optional().default(''),
  nip: z.string().min(1, 'NIP wajib diisi').max(30),
  phone: z.string().optional().default(''),
  address: z.string().optional().default(''),
  subject: z.string().optional().default(''),
})

export default defineEventHandler(async (event) => {
  const { organization } = await requireOrganizationAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID guru diperlukan' })

  const parsed = updateTeacherSchema.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: parsed.error.issues[0]?.message ?? 'Data tidak valid' })
  const data = parsed.data

  const teacher = await db.query.teachers.findFirst({
    where: and(eq(teachers.id, id), eq(teachers.organizationId, organization.id)),
    columns: { id: true, userId: true },
  })
  if (!teacher) throw createError({ statusCode: 404, statusMessage: 'Guru tidak ditemukan' })

  const dupNip = await db.query.teachers.findFirst({
    where: and(eq(teachers.organizationId, organization.id), eq(teachers.nip, data.nip), ne(teachers.id, id)),
    columns: { id: true },
  })
  if (dupNip) throw createError({ statusCode: 409, statusMessage: `NIP ${data.nip} sudah digunakan guru lain` })

  if (data.code) {
    const dupCode = await db.query.teachers.findFirst({
      where: and(eq(teachers.organizationId, organization.id), eq(teachers.code, data.code), ne(teachers.id, id)),
      columns: { id: true },
    })
    if (dupCode) throw createError({ statusCode: 409, statusMessage: `Kode guru ${data.code} sudah digunakan` })
  }

  await db.update(users).set({ name: data.name }).where(eq(users.id, teacher.userId))
  await db.update(teachers).set({
    code: data.code || null,
    nip: data.nip,
    phone: data.phone || null,
    address: data.address || null,
    subject: data.subject || null,
  }).where(and(eq(teachers.id, id), eq(teachers.organizationId, organization.id)))

  return { success: true, message: 'Data guru berhasil diupdate' }
})
