import { z } from 'zod'
import { courses, courseTeachers, courseClasses, sections, teachers } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { eq } from 'drizzle-orm'
import { requireOrganization } from '~~/server/utils/tenant'

const schema = z.object({
  name: z.string().trim().min(1, 'Nama course wajib diisi').max(200),
  code: z.string().trim().max(50).optional().default(''),
  description: z.string().trim().max(5000).optional().default(''),
  coverUrl: z.string().max(500).refine((value) => value === '' || value.startsWith('/uploads/') || /^https?:\/\//.test(value), 'URL gambar tidak valid').optional(),
  classIds: z.array(z.string()).optional().default([]),
  teacherIds: z.array(z.string()).optional().default([]),
  categoryId: z.string().nullable().optional(),
  subjectId: z.string().nullable().optional(),
})

export default defineEventHandler(async (event) => {
  const { user, organization } = await requireOrganization(event)
  if (!['admin', 'org_admin', 'owner', 'teacher'].includes(user.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Akses ditolak' })
  }

  const creatorTeacher = await db.query.teachers.findFirst({
    where: eq(teachers.userId, user.id),
    columns: { id: true },
  })
  if (user.role === 'teacher' && !creatorTeacher) {
    throw createError({ statusCode: 400, statusMessage: 'Data guru tidak ditemukan' })
  }

  const body = schema.parse(await readBody(event))

  const id = crypto.randomUUID()
  await db.insert(courses).values({
    id,
    organizationId: organization.id,
    name: body.name,
    code: body.code || null,
    description: body.description || null,
    coverUrl: body.coverUrl || null,
    categoryId: body.categoryId || null,
    subjectId: body.subjectId || null,
    createdBy: user.id,
  })

  const allTeacherIds = [...new Set([
    ...(creatorTeacher ? [creatorTeacher.id] : []),
    ...body.teacherIds,
  ])]
  if (allTeacherIds.length) {
    await db.insert(courseTeachers).values(
      allTeacherIds.map((tid) => ({ courseId: id, teacherId: tid })),
    )
  }
  if (body.classIds.length) {
    await db.insert(courseClasses).values(
      body.classIds.map((cid) => ({ courseId: id, classId: cid })),
    )
  }

  // Default section "Umum"
  await db.insert(sections).values({ id: crypto.randomUUID(), courseId: id, title: 'Umum', position: 1 })

  return { success: true, id }
})