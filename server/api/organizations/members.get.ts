import { and, asc, eq, gt, isNull } from 'drizzle-orm'
import { organizationInvites, organizationMembers, users } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireOrganizationAdmin } from '~~/server/utils/tenant'

export default defineEventHandler(async (event) => {
  const { organization } = await requireOrganizationAdmin(event)

  const members = await db
    .select({ userId: users.id, name: users.name, email: users.email, role: organizationMembers.role, status: organizationMembers.status })
    .from(organizationMembers)
    .innerJoin(users, eq(users.id, organizationMembers.userId))
    .where(eq(organizationMembers.organizationId, organization.id))
    .orderBy(asc(organizationMembers.role), asc(users.name))

  const invites = await db
    .select({ email: organizationInvites.email, role: organizationInvites.role, expiresAt: organizationInvites.expiresAt })
    .from(organizationInvites)
    .where(and(eq(organizationInvites.organizationId, organization.id), isNull(organizationInvites.acceptedAt), gt(organizationInvites.expiresAt, new Date())))
    .orderBy(asc(organizationInvites.email))

  return { data: { members, invites } }
})
