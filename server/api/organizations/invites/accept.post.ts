import { createHash } from 'node:crypto'
import bcrypt from 'bcrypt'
import { eq, and, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { organizationInvites, organizationMembers, users } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { createProfileForRoleAsync } from '~~/server/utils/profile'

const bodySchema = z.object({
  token: z.string().min(20),
  name: z.string().trim().min(2).max(100),
  password: z.string().min(8).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/).regex(/[^a-zA-Z0-9]/),
})

export default defineEventHandler(async (event) => {
  const body = bodySchema.parse(await readBody(event))
  const tokenHash = createHash('sha256').update(body.token).digest('hex')
  const invite = await db.query.organizationInvites.findFirst({ where: eq(organizationInvites.tokenHash, tokenHash) })
  if (!invite || invite.acceptedAt || invite.expiresAt <= new Date()) {
    throw createError({ statusCode: 400, statusMessage: 'Undangan tidak valid atau sudah kedaluwarsa' })
  }

  const existing = await db.query.users.findFirst({ where: eq(users.email, invite.email), columns: { id: true } })
  if (existing) throw createError({ statusCode: 409, statusMessage: 'Email sudah terdaftar. Silakan masuk.' })

  // better-sqlite3 tidak mendukung async transaction; sequential + rollback kompensasi.
  const userId = crypto.randomUUID()
  const password = await bcrypt.hash(body.password, 10)
  let userCreated = false
  let created: any
  try {
    const [user] = await db.insert(users).values({
      id: userId, organizationId: invite.organizationId, email: invite.email, name: body.name, role: invite.role, password,
    }).returning({ id: users.id, email: users.email, name: users.name, role: users.role, organizationId: users.organizationId })
    if (!user) throw createError({ statusCode: 500, statusMessage: 'Gagal membuat akun' })
    userCreated = true
    created = user
    await db.insert(organizationMembers).values({ organizationId: invite.organizationId, userId, role: invite.role, status: 'active' })
    await createProfileForRoleAsync(invite.role, userId, { organizationId: invite.organizationId })
    await db.update(organizationInvites).set({ acceptedAt: new Date() }).where(and(eq(organizationInvites.tokenHash, tokenHash), isNull(organizationInvites.acceptedAt)))
  } catch (err) {
    if (userCreated) await db.delete(users).where(eq(users.id, userId)).catch(() => {})
    throw err
  }

  return { success: true, user: created }
})