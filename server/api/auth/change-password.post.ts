import bcrypt from 'bcrypt'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { users } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { writeAuditLog } from '~~/server/utils/audit'

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
})

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const body = schema.parse(await readBody(event))
  const target = await db.query.users.findFirst({ where: eq(users.id, user.id) })
  if (!target || !(await bcrypt.compare(body.currentPassword, target.password))) throw createError({ statusCode: 400, statusMessage: 'Password lama salah' })
  await (db as any).update(users).set({ password: await bcrypt.hash(body.newPassword, 10), mustChangePassword: false }).where(eq(users.id, user.id))
  await writeAuditLog({ userId: user.id, action: 'auth.change_password', target: user.id })
  return { success: true }
})
