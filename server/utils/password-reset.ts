import crypto from 'node:crypto'
import nodemailer from 'nodemailer'
import { eq } from 'drizzle-orm'
import { passwordResetTokens, users } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

export async function sendPasswordResetEmail(email: string) {
  const config = useRuntimeConfig()
  const user = await db.query.users.findFirst({ where: eq(users.email, email) })
  if (!user) return

  await (db as any).delete(passwordResetTokens).where(eq(passwordResetTokens.userId, user.id))
  const token = crypto.randomBytes(32).toString('hex')
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
  await (db as any).insert(passwordResetTokens).values({
    tokenHash, userId: user.id, expiresAt: new Date(Date.now() + 30 * 60_000),
  })

  if (!config.smtpHost || !config.smtpUser || !config.smtpPassword) {
    console.warn(`[password-reset] SMTP belum dikonfigurasi; token: ${token}`)
    return
  }
  const transport = nodemailer.createTransport({
    host: config.smtpHost, port: Number(config.smtpPort), secure: Number(config.smtpPort) === 465,
    auth: { user: config.smtpUser, pass: config.smtpPassword },
  })
  const url = `${config.publicAppUrl}/auth/reset-password?token=${token}`
  await transport.sendMail({
    from: config.smtpFrom || config.smtpUser, to: user.email,
    subject: 'Reset password Talentia School',
    text: `Buka link berikut untuk membuat password baru (berlaku 30 menit): ${url}`,
    html: `<p>Buka link berikut untuk membuat password baru (berlaku 30 menit):</p><p><a href="${url}">${url}</a></p>`,
  })
}

export function hashResetToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex')
}
