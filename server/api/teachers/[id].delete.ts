import { and, eq } from 'drizzle-orm'
import { classes, teachers, users } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireOrganizationAdmin } from '~~/server/utils/tenant'

export default defineEventHandler(async (event) => {
  const { organization } = await requireOrganizationAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID guru diperlukan' })

  const teacher = await db.query.teachers.findFirst({
    where: and(eq(teachers.id, id), eq(teachers.organizationId, organization.id)),
    columns: { id: true, userId: true },
  })
  if (!teacher) throw createError({ statusCode: 404, statusMessage: 'Guru tidak ditemukan' })

  const assignedClasses = await db.query.classes.findFirst({
    where: and(eq(classes.teacherId, id), eq(classes.organizationId, organization.id)),
    columns: { id: true },
  })
  if (assignedClasses) {
    throw createError({ statusCode: 400, statusMessage: 'Guru masih menjadi wali kelas. Pindahkan wali kelas terlebih dahulu.' })
  }

  await db.delete(teachers).where(and(eq(teachers.id, id), eq(teachers.organizationId, organization.id)))
  await db.delete(users).where(eq(users.id, teacher.userId))

  return { success: true, message: 'Guru berhasil dihapus' }
})