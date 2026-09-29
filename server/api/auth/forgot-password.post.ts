import { z } from 'zod'
import { sendPasswordResetEmail } from '~~/server/utils/password-reset'
import { enforceAuthRateLimit, authRateLimitKey } from '~~/server/utils/authRateLimit'

// ponytail: bucket in-memory per instance; pindah ke Redis/DB saat multi-replica.
export default defineEventHandler(async (event) => {
  enforceAuthRateLimit(`forgot:${authRateLimitKey(event)}`, 5, 15 * 60_000)
  const { email } = z.object({ email: z.string().email() }).parse(await readBody(event))
  await sendPasswordResetEmail(email.toLowerCase())
  return { success: true, message: 'Jika email terdaftar, link reset sudah dikirim.' }
})
