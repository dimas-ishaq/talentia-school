import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '~~/server/utils/db'
import { requireAdmin } from '~~/server/utils/requireAdmin'

const activeStatusSchema = z.object({ isActive: z.boolean() })

export function createActiveStatusHandler(table: any, label: string) {
  return defineEventHandler(async (event) => {
    await requireAdmin(event)

    const id = getRouterParam(event, 'id')
    if (!id) throw createError({ statusCode: 400, statusMessage: 'ID tidak valid' })

    const parsed = activeStatusSchema.safeParse(await readBody(event))
    if (!parsed.success) {
      throw createError({ statusCode: 400, statusMessage: 'Data tidak valid' })
    }

    const [updated] = await db
      .update(table)
      .set({ isActive: parsed.data.isActive })
      .where(eq(table.id, id))
      .returning({ id: table.id })

    if (!updated) {
      throw createError({ statusCode: 404, statusMessage: `${label} tidak ditemukan` })
    }

    return { success: true, isActive: parsed.data.isActive }
  })
}
