import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { parents, students } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireOrganizationAdmin } from '~~/server/utils/tenant'
import { writeAuditLog } from '~~/server/utils/audit'

const schema = z.object({ parentId: z.string().min(1).nullable() })

export default defineEventHandler(async (event) => {
  const { organization, user: admin } = await requireOrganizationAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID siswa diperlukan' })
  const body = schema.parse(await readBody(event))

  const student = await db.query.students.findFirst({
    where: and(eq(students.id, id), eq(students.organizationId, organization.id)),
    columns: { id: true, parentId: true },
  })
  if (!student) throw createError({ statusCode: 404, statusMessage: 'Siswa tidak ditemukan' })

  if (body.parentId !== null) {
    const parent = await db.query.parents.findFirst({
      where: and(eq(parents.id, body.parentId), eq(parents.organizationId, organization.id)),
      columns: { id: true },
    })
    if (!parent) throw createError({ statusCode: 404, statusMessage: 'Orang tua tidak ditemukan di organisasi ini' })
  }

  await db.update(students).set({ parentId: body.parentId }).where(and(eq(students.id, id), eq(students.organizationId, organization.id)))
  await writeAuditLog({ userId: admin.id, action: 'student.parent_assign', target: id, metadata: { parentId: body.parentId } })
  return { success: true }
})
