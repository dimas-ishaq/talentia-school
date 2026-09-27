import { and, eq, ne } from 'drizzle-orm'
import { z } from 'zod'
import { questionPackages } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requirePackageManager } from '~~/server/utils/questionPackage'

const schema = z.object({
  name: z.string().trim().min(1).max(150).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const pkg = await requirePackageManager(event, id)
  const body = schema.parse(await readBody(event))

  if (body.name) {
    const duplicate = await db.query.questionPackages.findFirst({
      where: and(
        eq(questionPackages.courseId, pkg.courseId),
        eq(questionPackages.name, body.name),
        eq(questionPackages.isActive, true),
        ne(questionPackages.id, id),
      ),
      columns: { id: true },
    })
    if (duplicate) throw createError({ statusCode: 409, statusMessage: 'Nama paket sudah dipakai di course ini' })
  }

  await db.update(questionPackages).set(body).where(eq(questionPackages.id, id))
  return { success: true }
})
