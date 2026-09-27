// server/api/classes/[id].delete.ts
import { db } from '~~/server/utils/db'
import { classes, students } from '~~/server/database/schema'
import { eq, count } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID tidak valid' })

  // Cek apakah masih ada siswa di kelas ini
  const [result] = await db
    .select({ value: count() })
    .from(students)
    .where(eq(students.classId, id))

  if ((result?.value ?? 0) > 0) {
    throw createError({
      statusCode: 409,
      statusMessage: `Kelas masih memiliki ${result?.value} siswa. Pindahkan dulu siswanya.`,
    })
  }

  const [deleted] = await db
    .delete(classes)
    .where(eq(classes.id, id))
    .returning({ id: classes.id })

  if (!deleted) {
    throw createError({ statusCode: 404, statusMessage: 'Kelas tidak ditemukan' })
  }

  return { success: true }
})