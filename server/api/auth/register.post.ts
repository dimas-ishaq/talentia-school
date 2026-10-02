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
  if (existingEmail) throw createError({ statusCode: 409, statusMessage: 'Email sudah terdaftar', data: { field: 'email' } })
  const existingUsername = await db.query.users.findFirst({ where: eq(users.name, username), columns: { id: true } })
  if (existingUsername) throw createError({ statusCode: 409, statusMessage: 'Username sudah dipakai', data: { field: 'username' } })

  const hashedPassword = await bcrypt.hash(body.password, 10)
  const userId = crypto.randomUUID()
  const organizationId = crypto.randomUUID()
  const name = body.organizationName.trim()
  const baseSlug = slugify(name)

  // Pilot terkelola: org baru suspended, operator mengaktifkan manual setelah verifikasi.
  // better-sqlite3 tidak mendukung async transaction (sync only); jaga atomik
  // lewat retry slug pada constraint + kompensasi hapus bila insert berikutnya gagal.
  // Postgres: driver async, tapi pilot tetap pakai path kompensasi yang sama (YAGNI).
  let slug = baseSlug
  let orgCreated = false
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      await db.insert(organizations).values({ id: organizationId, name, slug, status: 'suspended' })
      orgCreated = true
      break
    } catch (err: any) {
      const msg = String(err?.message ?? '')
      const uniqueViolation = /UNIQUE constraint failed: organizations\.slug/i.test(msg) || /duplicate key value violates unique constraint/i.test(msg)
      if (!uniqueViolation) throw err
      if (attempt === 49) throw err
      slug = `${baseSlug}-${attempt + 2}`
    }
  }

  let userCreated = false
  let created: any
  try {
    const rows = await db
      .insert(users)
      .values({ id: userId, organizationId, email, name: username, role: 'admin', password: hashedPassword })
      .returning()
    created = rows[0]
    if (!created) throw createError({ statusCode: 500, statusMessage: 'Gagal membuat akun' })
    userCreated = true
    await db.insert(organizationMembers).values({ organizationId, userId, role: 'owner', status: 'active' })
  } catch (err) {
    if (userCreated) await db.delete(users).where(eq(users.id, userId)).catch(() => {})
    if (orgCreated) await db.delete(organizations).where(eq(organizations.id, organizationId)).catch(() => {})
    throw err
  }

  setResponseStatus(event, 201)
  return { success: true, user: { id: created.id, email: created.email, name: created.name, role: 'owner' } }
})
