import { createHash, randomBytes } from 'node:crypto'
import { eq, and, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { organizationInvites } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireOrganizationAdmin } from '~~/server/utils/tenant'

const bodySchema = z.object({
  email: z.string().email('Email tidak valid'),
  role: z.enum(['org_admin', 'teacher', 'student', 'parent']),
})

export default defineEventHandler(async (event) => {
  const { organization } = await requireOrganizationAdmin(event)
  const body = bodySchema.parse(await readBody(event))
  const email = body.email.trim().toLowerCase()

  const existing = await db.query.organizationInvites.findFirst({
    where: and(eq(organizationInvites.organizationId, organization.id), eq(organizationInvites.email, email), isNull(organizationInvites.acceptedAt)),
  })
  if (existing && existing.expiresAt > new Date()) {
    throw createError({ statusCode: 409, statusMessage: 'Undangan aktif untuk email tersebut sudah ada' })
  }

  const rawToken = randomBytes(32).toString('base64url')
  const tokenHash = createHash('sha256').update(rawToken).digest('hex')
  await db.insert(organizationInvites).values({
    tokenHash,
    organizationId: organization.id,
    email,
    role: body.role,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  })

  const config = useRuntimeConfig(event)
  return { success: true, email, role: body.role, inviteUrl: `${config.publicAppUrl}/auth/accept-invite?token=${rawToken}` }
})
