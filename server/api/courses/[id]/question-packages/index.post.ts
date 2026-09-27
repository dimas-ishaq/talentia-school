import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { questionPackages } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireCourseManager } from '~~/server/utils/courseAccess'

const schema = z.object({
  name: z.string().trim().min(1, 'Nama paket wajib diisi').max(150),
  description: z.string().trim().max(2000).optional().default(''),
})

export default defineEventHandler(async (event) => {
  const courseId = getRouterParam(event, 'id')!
  await requireCourseManager(event, courseId)
  const { user } = await requireUserSession(event)
  const body = schema.parse(await readBody(event))

  const duplicate = await db.query.questionPackages.findFirst({
    where: and(eq(questionPackages.courseId, courseId), eq(questionPackages.name, body.name), eq(questionPackages.isActive, true)),
    columns: { id: true },
  })
  if (duplicate) throw createError({ statusCode: 409, statusMessage: 'Nama paket sudah dipakai di course ini' })

  const id = crypto.randomUUID()
  await db.insert(questionPackages).values({
    id,
    courseId,
    name: body.name,
    description: body.description || null,
    createdBy: user.id,
  })

  return { success: true, data: { id } }
})
