import { eq, inArray, and } from 'drizzle-orm'
import { activityProgress, activities, attendance, courseClasses, courses, sections, students } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireOrganization } from '~~/server/utils/tenant'

export default defineEventHandler(async (event) => {
  const { user, organization } = await requireOrganization(event)
  if (user.role !== 'student') throw createError({ statusCode: 403, statusMessage: 'Akses khusus siswa' })

  const student = await db.query.students.findFirst({ where: and(eq(students.userId, user.id), eq(students.organizationId, organization.id)), columns: { id: true, classId: true } })
  if (!student?.classId) return { activeAssignments: 0, pendingQuizzes: 0, averageGrade: 0, attendanceRate: 0 }

  const assigned = await db.select({ id: courseClasses.courseId }).from(courseClasses).where(eq(courseClasses.classId, student.classId))
  const courseIds = assigned.map((row) => row.id)
  if (!courseIds.length) return { activeAssignments: 0, pendingQuizzes: 0, averageGrade: 0, attendanceRate: 0 }

  const activityRows = await db.select({ id: activities.id, type: activities.type, dueDate: activities.dueDate })
    .from(activities).innerJoin(sections, eq(activities.sectionId, sections.id))
    .where(and(inArray(sections.courseId, courseIds), eq(activities.isVisible, true), eq(sections.isVisible, true)))
  const progressRows = await db.select({ activityId: activityProgress.activityId, submittedAt: activityProgress.submittedAt, score: activityProgress.score })
    .from(activityProgress).where(eq(activityProgress.studentId, student.id))
  const progress = new Map(progressRows.map((row) => [row.activityId, row]))
  const assignments = activityRows.filter((row) => row.type === 'assignment' && !progress.get(row.id)?.submittedAt)
  const quizzes = activityRows.filter((row) => row.type === 'quiz' && !progress.get(row.id)?.submittedAt)
  const scores = progressRows.map((row) => row.score).filter((score): score is number => score != null)
  const attendanceRows = await db.select({ status: attendance.status }).from(attendance).where(eq(attendance.studentId, student.id))
  const present = attendanceRows.filter((row) => row.status === 'present' || row.status === 'late').length

  return {
    activeAssignments: assignments.length,
    pendingQuizzes: quizzes.length,
    averageGrade: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
    attendanceRate: attendanceRows.length ? Math.round((present / attendanceRows.length) * 100) : 0,
  }
})
