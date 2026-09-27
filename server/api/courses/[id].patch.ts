import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { courses, courseTeachers, courseClasses, teachers, categories, subjects } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireCourseManager } from '~~/server/utils/courseAccess'

const schema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  code: z.string().trim().max(50).optional(),
  description: z.string().trim().max(5000).optional(),
  coverUrl: z.string().max(500).refine((value) => value === '' || value.startsWith('/uploads/'), 'URL gambar tidak valid').optional(),
  classIds: z.array(z.string()).optional(),
  teacherIds: z.array(z.string()).optional(),
  categoryId: z.string().nullable().optional(),
  subjectId: z.string().nullable().optional(),
  position: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const course = await requireCourseManager(event, id)
  const body = schema.parse(await readBody(event))

  const updateData: Record<string, unknown> = {}
  if (body.name !== undefined) updateData.name = body.name
  if (body.code !== undefined) updateData.code = body.code || null
  if (body.description !== undefined) updateData.description = body.description || null
  if (body.coverUrl !== undefined) updateData.coverUrl = body.coverUrl || null
  if (body.categoryId !== undefined) updateData.categoryId = body.categoryId
  if (body.subjectId !== undefined) updateData.subjectId = body.subjectId
  if (body.position !== undefined) updateData.position = body.position
  if (body.isActive !== undefined) updateData.isActive = body.isActive

  if (Object.keys(updateData).length) {
    await db.update(courses).set(updateData).where(eq(courses.id, id))
  }

  // Sync classIds & teacherIds: delete all, re-insert
  if (body.classIds !== undefined) {
    await db.delete(courseClasses).where(eq(courseClasses.courseId, id))
    if (body.classIds.length) {
      await db.insert(courseClasses).values(body.classIds.map((cid) => ({ courseId: id, classId: cid })))
    }
  }
  if (body.teacherIds !== undefined) {
    // Keep the original creator
    await db.delete(courseTeachers).where(eq(courseTeachers.courseId, id))
    const creatorTeacher = await db.query.teachers.findFirst({
      where: eq(teachers.userId, course.createdBy),
      columns: { id: true },
    })
    const ids = [...new Set([...(creatorTeacher ? [creatorTeacher.id] : []), ...body.teacherIds])]
    if (ids.length) {
      await db.insert(courseTeachers).values(ids.map((tid) => ({ courseId: id, teacherId: tid })))
    }
  }

  return { success: true }
})