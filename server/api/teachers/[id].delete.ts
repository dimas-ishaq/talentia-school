// server/api/teachers/[id].delete.ts
import { db } from '~~/server/utils/db'
import { teachers, users, classes } from '~~/server/database/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID guru diperlukan' })
  }

  // Cari guru
  const teacher = await db.query.teachers.findFirst({
    where: eq(teachers.id, id),
    columns: { id: true, userId: true },
  })
  if (!teacher) {
    throw createError({ statusCode: 404, statusMessage: 'Guru tidak ditemukan' })
  }

  // Cek apakah guru masih menjadi wali kelas
  const assignedClasses = await db.query.classes.findFirst({
    where: eq(classes.teacherId, id),
    columns: { id: true },
  })
  if (assignedClasses) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Guru masih menjadi wali kelas. Pindahkan wali kelas terlebih dahulu.',
    })
  }

  // Hapus dalam transaksi
  await db.transaction(async (tx) => {
    await tx.delete(teachers).where(eq(teachers.id, id))
    await tx.delete(users).where(eq(users.id, teacher.userId))
  })

  return {
    success: true,
    message: 'Guru berhasil dihapus',
  }
})