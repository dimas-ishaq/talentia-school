// server/api/teachers/[id].get.ts
import { db } from '~~/server/utils/db'
import { teachers, users } from '~~/server/database/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID guru diperlukan' })
  }

  const row = await db
    .select({
      id: teachers.id,
      name: users.name,
      code: teachers.code,
      nip: teachers.nip,
      phone: teachers.phone,
      address: teachers.address,
      subject: teachers.subject,
      email: users.email,
    })
    .from(teachers)
    .leftJoin(users, eq(teachers.userId, users.id))
    .where(eq(teachers.id, id))
    .limit(1)

  if (!row.length) {
    throw createError({ statusCode: 404, statusMessage: 'Guru tidak ditemukan' })
  }

  return { success: true, data: row[0] }
})