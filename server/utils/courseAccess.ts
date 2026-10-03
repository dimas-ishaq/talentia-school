import { and, eq } from 'drizzle-orm'
import { courses, courseTeachers, teachers } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireOrganization } from '~~/server/utils/tenant'

export async function findCourseOrThrow(courseId: string, organizationId?: string) {
  const course = await db.query.courses.findFirst({
    where: organizationId
      ? and(eq(courses.id, courseId), eq(courses.organizationId, organizationId))
      : eq(courses.id, courseId),
  })
  if (!course) throw createError({ statusCode: 404, statusMessage: 'Course tidak ditemukan' })
  return course
}

export async function isCourseManager(userId: string, courseId: string, organizationId: string) {
  const teacher = await db.query.teachers.findFirst({
    where: and(eq(teachers.userId, userId), eq(teachers.organizationId, organizationId)),
    columns: { id: true },
  })
  if (!teacher) return false
  const link = await db.query.courseTeachers.findFirst({
    where: and(eq(courseTeachers.courseId, courseId), eq(courseTeachers.teacherId, teacher.id)),
    columns: { courseId: true },
  })
  return !!link
}

// Admin selalu boleh. Guru hanya jika terdaftar di course_teachers.
// Course wajib berada di organisasi yang sama dengan user (isolasi tenant).
export async function requireCourseManager(event: any, courseId: string) {
  const { user, organization } = await requireOrganization(event)
  const course = await findCourseOrThrow(courseId, organization.id)
  if (user.role === 'admin' || user.role === 'org_admin' || user.role === 'owner') return course
  if (user.role === 'teacher' && (await isCourseManager(user.id, courseId, organization.id))) return course
  throw createError({ statusCode: 403, statusMessage: 'Anda tidak mengampu course ini' })
}
