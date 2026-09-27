import { z } from 'zod'
import { sendPasswordResetEmail } from '~~/server/utils/password-reset'

export default defineEventHandler(async (event) => {
  const { email } = z.object({ email: z.string().email() }).parse(await readBody(event))
  await sendPasswordResetEmail(email.toLowerCase())
  return { success: true, message: 'Jika email terdaftar, link reset sudah dikirim.' }
})
