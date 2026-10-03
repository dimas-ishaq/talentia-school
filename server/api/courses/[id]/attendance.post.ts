import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { attendance, courseClasses, courses, students } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { isCourseManager } from '~~/server/utils/courseAccess'
import { requireOrganization } from '~~/server/utils/tenant'

const schema = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), status: z.enum(['present', 'late', 'excused', 'sick']), activityNote: z.string().max(1000).optional().default(''), learningNote: z.string().max(1000).optional().default('') }).superRefine((body, ctx) => { if (!body.activityNote.trim() && !body.learningNote.trim()) ctx.addIssue({ code: 'custom', path: ['learningNote'], message: 'Kegiatan atau hal yang dipelajari wajib diisi' }) })
export default defineEventHandler(async (event) => {
  const { user, organization } = await requireOrganization(event); const courseId = getRouterParam(event, 'id')!; const body = schema.parse(await readBody(event))
  const course = await db.query.courses.findFirst({ where: eq(courses.id, courseId), columns: { id: true, organizationId: true } }); if (!course) throw createError({ statusCode: 404, statusMessage: 'Course tidak ditemukan' })
  const student = await db.query.students.findFirst({ where: and(eq(students.userId, user.id), eq(students.organizationId, organization.id)), columns: { id: true, classId: true, organizationId: true } }); if (!student) throw createError({ statusCode: 403, statusMessage: 'Profil siswa tidak ditemukan' })
  if (user.role !== 'student' || !student.classId) throw createError({ statusCode: 403, statusMessage: 'Hanya siswa yang dapat mengisi logbook' })
  if (course.organizationId !== organization.id) throw createError({ statusCode: 403, statusMessage: 'Course bukan milik organisasi Anda' })
  if (student && (student as any).organizationId && (student as any).organizationId !== organization.id) throw createError({ statusCode: 403, statusMessage: 'Siswa bukan milik organisasi Anda' })
  const enrolled = await db.query.courseClasses.findFirst({ where: and(eq(courseClasses.courseId, courseId), eq(courseClasses.classId, student.classId)), columns: { courseId: true } }); if (!enrolled) throw createError({ statusCode: 403, statusMessage: 'Anda tidak terdaftar di course ini' })
  const [saved] = await db.insert(attendance).values({ id: crypto.randomUUID(), organizationId: course.organizationId, studentId: student.id, classId: student.classId, courseId, date: body.date, status: body.status, note: body.learningNote.trim() || null, activityNote: body.activityNote.trim() || null, learningNote: body.learningNote.trim() || null, recordedBy: user.id }).onConflictDoUpdate({ target: [attendance.studentId, attendance.courseId, attendance.date], set: { status: body.status, note: body.learningNote.trim() || null, activityNote: body.activityNote.trim() || null, learningNote: body.learningNote.trim() || null, recordedBy: user.id } }).returning()
  return { success: true, data: saved }
})
