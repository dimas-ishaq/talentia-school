import bcrypt from 'bcrypt'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { users, organizationMembers } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireOrganizationAdmin } from '~~/server/utils/tenant'
import { createProfileForRoleAsync } from '~~/server/utils/profile'

const bodySchema = z.object({
  email: z.string().email('Email tidak valid'),
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  role: z.enum(['org_admin', 'teacher', 'student', 'parent']),
  password: z.string().min(8, 'Password minimal 8 karakter'),
})

export default defineEventHandler(async (event) => {
  const { membership, organization } = await requireOrganizationAdmin(event)
  const body = bodySchema.parse(await readBody(event))
  if (body.role === 'org_admin' && membership.role !== 'owner') throw createError({ statusCode: 403, statusMessage: 'Hanya owner yang dapat menambah admin organisasi' })
  const email = body.email.trim().toLowerCase()
  const existing = await db.query.users.findFirst({ where: eq(users.email, email), columns: { id: true } })
  if (existing) throw createError({ statusCode: 409, statusMessage: 'Email sudah digunakan' })

  const userId = crypto.randomUUID()
  const hashedPassword = await bcrypt.hash(body.password, 10)
  let userCreated = false
  try {
    const [row] = await db.insert(users).values({
      id: userId, organizationId: organization.id, email, name: body.name.trim(), role: body.role, password: hashedPassword,
    }).returning({ id: users.id, email: users.email, name: users.name, role: users.role })
    if (!row) throw createError({ statusCode: 500, statusMessage: 'Gagal membuat pengguna' })
    userCreated = true
    await db.insert(organizationMembers).values({ organizationId: organization.id, userId, role: body.role, status: 'active' })
    await createProfileForRoleAsync(body.role, userId, { organizationId: organization.id })
    return { success: true, data: row }
  } catch (err) {
    if (userCreated) await db.delete(users).where(eq(users.id, userId)).catch(() => {})
    throw err
  }
})
