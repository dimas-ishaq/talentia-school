// server/api/teachers/[id].patch.ts
import { db } from '~~/server/utils/db'
import { teachers, users } from '~~/server/database/schema'
import { eq, and, ne } from 'drizzle-orm'
import { z } from 'zod'

const updateTeacherSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi').max(100),
  code: z.string().optional().default(''),
  nip: z.string().min(1, 'NIP wajib diisi').max(30),
  phone: z.string().optional().default(''),
  address: z.string().optional().default(''),
  subject: z.string().optional().default(''),
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID guru diperlukan' })
  }

  const body = await readBody(event)
  const parsed = updateTeacherSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message ?? 'Data tidak valid',
    })
  }

  const data = parsed.data

  // Cek guru exists
  const teacher = await db.query.teachers.findFirst({
    where: eq(teachers.id, id),
    columns: { id: true, userId: true },
  })
  if (!teacher) {
    throw createError({ statusCode: 404, statusMessage: 'Guru tidak ditemukan' })
  }

  // Cek NIP duplikat (kecuali dirinya sendiri)
  const dupNip = await db.query.teachers.findFirst({
    where: and(eq(teachers.nip, data.nip), ne(teachers.id, id)),
    columns: { id: true },
  })
  if (dupNip) {
    throw createError({
      statusCode: 409,
      statusMessage: `NIP ${data.nip} sudah digunakan guru lain`,
    })
  }

  // Cek kode duplikat (kecuali dirinya sendiri)
  const dupCode = await db.query.teachers.findFirst({
    where: and(eq(teachers.code, data.code), ne(teachers.id, id)),
    columns: { id: true },
  })
  if (dupCode && data.code) {
    throw createError({
      statusCode: 409,
      statusMessage: `Kode guru ${data.code} sudah digunakan`,
    })
  }

  // Update dalam transaksi
  await db.transaction(async (tx) => {
    await tx.update(users).set({ name: data.name }).where(eq(users.id, teacher.userId))
    await tx
      .update(teachers)
      .set({
        code: data.code || null,
        nip: data.nip,
        phone: data.phone || null,
        address: data.address || null,
        subject: data.subject || null,
      })
      .where(eq(teachers.id, id))
  })

  return {
    success: true,
    message: 'Data guru berhasil diupdate',
  }
})