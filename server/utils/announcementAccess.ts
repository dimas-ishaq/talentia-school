import { requireOrganization } from '~~/server/utils/tenant'

/**
 * Role yang boleh mengelola (CRUD) pengumuman.
 * Guru ikut diizinkan karena sebelumnya halaman "Buat Pengumuman" memang
 * dibuka untuk teacher dan admin.
 */
export const ANNOUNCEMENT_MANAGER_ROLES = ['admin', 'org_admin', 'owner', 'teacher'] as const

export function isAnnouncementManager(role: string | undefined | null) {
  return ANNOUNCEMENT_MANAGER_ROLES.includes(role as (typeof ANNOUNCEMENT_MANAGER_ROLES)[number])
}

/** Pastikan user adalah anggota organisasi aktif dan berhak mengelola pengumuman. */
export async function requireAnnouncementManager(event: Parameters<typeof requireOrganization>[0]) {
  const context = await requireOrganization(event)
  if (!isAnnouncementManager(context.user.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Akses pengumuman ditolak' })
  }
  return context
}
