// server/api/auth/register.post.ts
// Onboarding sekolah: membuat organization + user owner + membership.
import bcrypt from 'bcrypt'
import { eq } from 'drizzle-orm'
import { db } from '~~/server/utils/db'
import { organizations, organizationMembers, users } from '~~/server/database/schema'
import { registerSchema } from '~~/shared/schemas/auth'
import { enforceAuthRateLimit, authRateLimitKey } from '~~/server/utils/authRateLimit'

const bodySchema = registerSchema

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'sekolah'
}

export default defineEventHandler(async (event) => {
  enforceAuthRateLimit(`register:${authRateLimitKey(event)}`, 5, 60 * 60_000)
  const body = await readValidatedBody(event, bodySchema.parse)

  if (body.password !== body.confirmPassword) {
    throw createError({ statusCode: 400, statusMessage: 'Password tidak sama', data: { field: 'confirmPassword' } })
  }

  const email = body.email.trim().toLowerCase()
  const username = body.username.trim()

  const existingEmail = await db.query.users.findFirst({ where: eq(users.email, email), columns: { id: true } })
  if (existingEmail) {
    throw createError({ statusCode: 409, statusMessage: 'Email sudah terdaftar', data: { field: 'email' } })
  }
  const existingUsername = await db.query.users.findFirst({ where: eq(users.name, username), columns: { id: true } })
  if (existingUsername) {
    throw createError({ statusCode: 409, statusMessage: 'Username sudah dipakai', data: { field: 'username' } })
  }

  const hashedPassword = await bcrypt.hash(body.password, 10)

  const created = await db.transaction(async (tx) => {
    const userId = crypto.randomUUID()
    const organizationId = crypto.randomUUID()

    // Slug unik: tambah suffix bila sudah dipakai.
    const baseSlug = slugify(body.organizationName)
    let slug = baseSlug
    for (let i = 2; i < 50; i++) {
      const clash = await tx.query.organizations.findFirst({ where: eq(organizations.slug, slug), columns: { id: true } })
      if (!clash) break
      slug = `${baseSlug}-${i}`
    }

    await tx.insert(organizations).values({ id: organizationId, name: body.organizationName.trim(), slug, status: 'trial' })

    const [newUser] = await tx
      .insert(users)
      .values({ id: userId, organizationId, email, name: username, role: 'admin', password: hashedPassword })
      .returning()
    if (!newUser) throw createError({ statusCode: 500, statusMessage: 'Gagal membuat akun' })

    await tx.insert(organizationMembers).values({ organizationId, userId, role: 'owner', status: 'active' })

    return newUser
  })

  setResponseStatus(event, 201)
  return {
    success: true,
    user: { id: created.id, email: created.email, name: created.name, role: 'owner' },
  }
})

