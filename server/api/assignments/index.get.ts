// server/api/assignments/index.get.ts
// Daftar tugas (type 'assignment') untuk siswa, lengkap dengan status pengiriman.
import { and, asc, eq, inArray } from 'drizzle-orm'
import { activities, sections, courses, courseClasses, students, activityProgress } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  if (user.role !== 'student') throw createError({ statusCode: 403, statusMessage: 'Hanya siswa' })

  const student = await db.query.students.findFirst({ where: eq(students.userId, user.id), columns: { id: true, classId: true } })
  if (!student?.classId) throw createError({ statusCode: 403, statusMessage: 'Data siswa tidak ditemukan' })

  const rows = await db
    .select({
      id: activities.id,
      title: activities.title,
      content: activities.content,
      points: activities.points,
      dueDate: activities.dueDate,
      allowLateSubmission: activities.allowLateSubmission,
      sectionTitle: sections.title,
      courseId: courses.id,
      courseName: courses.name,
    })
    .from(activities)
    .innerJoin(sections, eq(activities.sectionId, sections.id))
    .innerJoin(courses, eq(sections.courseId, courses.id))
    .innerJoin(courseClasses, and(eq(courseClasses.courseId, courses.id), eq(courseClasses.classId, student.classId!)))
    .where(and(eq(activities.type, 'assignment'), eq(activities.isVisible, true)))
    .orderBy(asc(courses.name), asc(sections.position), asc(activities.position))

  if (!rows.length) return { data: [] }

  const progressRows = await db
    .select()
    .from(activityProgress)
    .where(and(eq(activityProgress.studentId, student.id), inArray(activityProgress.activityId, rows.map((r) => r.id))))

  const byActivity = new Map(progressRows.map((p) => [p.activityId, p]))
  const now = Date.now()

  return {
    data: rows.map((r) => {
      const p: any = byActivity.get(r.id)
      const dueMs = r.dueDate ? new Date(r.dueDate).getTime() : null
      const overdue = dueMs != null && Number.isFinite(dueMs) && now > dueMs && !p?.submittedAt
      const locked = !!p?.gradedAt && !p?.returnedAt
      return {
        id: r.id,
        title: r.title,
        content: r.content,
        points: r.points,
        dueDate: r.dueDate,
        allowLateSubmission: r.allowLateSubmission,
        sectionTitle: r.sectionTitle,
        courseId: r.courseId,
        courseName: r.courseName,
        submittedAt: p?.submittedAt ? new Date(p.submittedAt).getTime() : null,
        isLate: !!p?.isLate,
        returnedAt: p?.returnedAt ? new Date(p.returnedAt).getTime() : null,
        returnReason: p?.returnReason ?? null,
        locked,
        overdue,
        // Nilai hanya.visible bila guru sudah publish (courseGrades.publish).
        score: p?.score ?? null,
        scorePublishedAt: p?.scorePublishedAt ? new Date(p.scorePublishedAt).getTime() : null,
        status: locked ? 'graded' : p?.returnedAt ? 'returned' : p?.submittedAt ? 'submitted' : overdue ? 'overdue' : 'pending',
      }
    }),
  }
})
