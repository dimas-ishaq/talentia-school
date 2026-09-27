import { eq, count as drizzleCount, inArray } from 'drizzle-orm'
import { courses, courseTeachers, teachers, sections, activities, quizAttempts } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  if (user.role !== 'teacher' && user.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Hanya guru/admin' })

  let courseIds: string[]
  if (user.role === 'admin') {
    const all = await db.select({ id: courses.id }).from(courses)
    courseIds = all.map((c) => c.id)
  } else {
    const teacher = await db.query.teachers.findFirst({ where: eq(teachers.userId, user.id) })
    if (!teacher) return { data: [] }
    const links = await db.select({ courseId: courseTeachers.courseId }).from(courseTeachers).where(eq(courseTeachers.teacherId, teacher.id))
    courseIds = links.map((l) => l.courseId)
  }
  if (!courseIds.length) return { data: [] }

  const courseRows = await db.select({ id: courses.id, name: courses.name }).from(courses).where(inArray(courses.id, courseIds))
  const courseNames = new Map(courseRows.map((c) => [c.id, c.name]))
  const allSections = await db.select().from(sections).where(inArray(sections.courseId, courseIds))
  const sectionIds = allSections.map((s) => s.id)
  const quizzes = sectionIds.length
    ? await db.select().from(activities).where(inArray(activities.sectionId, sectionIds))
    : []
  const quizActivities = quizzes.filter((a) => a.type === 'quiz')

  const result = []
  for (const q of quizActivities) {
    const section = allSections.find((s) => s.id === q.sectionId)
    if (!section) continue
    const countRows = await db.select({ total: drizzleCount() }).from(quizAttempts).where(eq(quizAttempts.activityId, q.id))
    const total = countRows[0]?.total ?? 0
    result.push({
      id: q.id,
      title: q.title,
      courseId: section.courseId,
      courseName: courseNames.get(section.courseId) ?? 'Course',
      openAt: q.openAt,
      closeAt: q.closeAt,
      totalAttempts: total,
    })
  }

  return { data: result }
})