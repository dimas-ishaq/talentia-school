import { requireOrganizationAdmin } from '~~/server/utils/tenant'

export async function requireAdmin(event: Parameters<typeof requireUserSession>[0]) {
  const context = await requireOrganizationAdmin(event)
  // Legacy admin role tetap diterima selama membership aktif.
  if (!['admin', 'org_admin', 'owner'].includes(context.user.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Akses admin diperlukan' })
  }
  return context.user
}

export async function requirePlatformAdmin(event: Parameters<typeof requireUserSession>[0]) {
  const { user } = await requireUserSession(event)
  if (!user || !['platform_owner', 'platform_admin'].includes((user as any).platformRole)) {
    throw createError({ statusCode: 403, statusMessage: 'Akses platform diperlukan' })
  }
  return user
}

