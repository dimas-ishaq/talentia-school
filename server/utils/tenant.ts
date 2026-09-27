import { and, eq } from 'drizzle-orm'
import { organizationMembers, organizations, users } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

export type OrganizationRole = 'owner' | 'org_admin' | 'teacher' | 'student' | 'parent'

export async function requireOrganization(event: Parameters<typeof requireUserSession>[0]) {
  const { user } = await requireUserSession(event)
  const organizationId = (user as { organizationId?: string }).organizationId
  if (!organizationId) throw createError({ statusCode: 503, statusMessage: 'Organisasi belum dikonfigurasi' })

  const membership = await db.query.organizationMembers.findFirst({
    where: and(eq(organizationMembers.organizationId, organizationId), eq(organizationMembers.userId, user.id), eq(organizationMembers.status, 'active')),
  })
  if (!membership) throw createError({ statusCode: 403, statusMessage: 'Keanggotaan organisasi tidak aktif' })

  const organization = await db.query.organizations.findFirst({ where: eq(organizations.id, organizationId) })
  if (!organization || organization.status === 'suspended' || organization.status === 'cancelled') {
    throw createError({ statusCode: 403, statusMessage: 'Organisasi tidak aktif' })
  }
  return { user, organization, membership }
}

export async function requireOrganizationAdmin(event: Parameters<typeof requireUserSession>[0]) {
  const context = await requireOrganization(event)
  if (!['owner', 'org_admin'].includes(context.membership.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Akses admin organisasi diperlukan' })
  }
  return context
}

export function organizationFilter<T>(column: T, organizationId: string) {
  return eq(column as never, organizationId)
}
