import { eq } from 'drizzle-orm'
import { questionPackages } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireCourseManager } from '~~/server/utils/courseAccess'

export async function findPackageOrThrow(packageId: string) {
  const pkg = await db.query.questionPackages.findFirst({ where: eq(questionPackages.id, packageId) })
  if (!pkg) throw createError({ statusCode: 404, statusMessage: 'Paket soal tidak ditemukan' })
  return pkg
}

// Admin boleh semua. Guru hanya jika mengampu course pemilik paket.
export async function requirePackageManager(event: any, packageId: string) {
  const pkg = await findPackageOrThrow(packageId)
  await requireCourseManager(event, pkg.courseId)
  return pkg
}
