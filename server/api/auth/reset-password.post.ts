import bcrypt from 'bcrypt'
import { and, eq, gt } from 'drizzle-orm'
import { z } from 'zod'
import { passwordResetTokens, users } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { hashResetToken } from '~~/server/utils/password-reset'
import { enforceAuthRateLimit, authRateLimitKey } from '~~/server/utils/authRateLimit.ts'

export default defineEventHandler(async (event) => {
  enforceAuthRateLimit(`reset:${authRateLimitKey(event)}`, 10, 15 * 60_000)
  const body = z.object({ token: z.string().length(64), newPassword: z.string().min(8).max(128) }).parse(await readBody(event))
  const row = await db.query.passwordResetTokens.findFirst({
    where: and(eq(passwordResetTokens.tokenHash, hashResetToken(body.token)), gt(passwordResetTokens.expiresAt, new Date())),
  })
  if (!row) throw createError({ statusCode: 400, statusMessage: 'Link reset tidak valid atau sudah kedaluwarsa.' })
  await (db as any).update(users).set({ password: await bcrypt.hash(body.newPassword, 10), mustChangePassword: false }).where(eq(users.id, row.userId))
  await (db as any).delete(passwordResetTokens).where(eq(passwordResetTokens.tokenHash, row.tokenHash))
  return { success: true }
})
