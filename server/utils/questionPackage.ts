import { and, eq } from 'drizzle-orm'
import { courses, questionPackages } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireCourseManager } from '~~/server/utils/courseAccess'
import { requireOrganization } from '~~/server/utils/tenant'

export async function findPackageOrThrow(packageId: string, organizationId?: string) {
  const pkg = await db.query.questionPackages.findFirst({ where: eq(questionPackages.id, packageId) })
  if (!pkg) throw createError({ statusCode: 404, statusMessage: 'Paket soal tidak ditemukan' })
  if (organizationId) {
    const course = await db.query.courses.findFirst({ where: and(eq(courses.id, pkg.courseId), eq(courses.organizationId, organizationId)) })
    if (!course) throw createError({ statusCode: 404, statusMessage: 'Paket soal tidak ditemukan' })
  }
  return pkg
}

// Admin boleh semua. Guru hanya jika mengampu course pemilik paket.
export async function requirePackageManager(event: any, packageId: string) {
  const { organization } = await requireOrganization(event)
  const pkg = await findPackageOrThrow(packageId, organization.id)
  await requireCourseManager(event, pkg.courseId)
  return pkg
}
