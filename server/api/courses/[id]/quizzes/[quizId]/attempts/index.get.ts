import { and, desc, eq } from 'drizzle-orm'
import { quizAttempts, students, users, classes } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireQuizActivity, requireEnrolledStudent, canStudentSeeScore } from '~~/server/utils/quiz'
import { requireCourseManager } from '~~/server/utils/courseAccess'

export default defineEventHandler(async (event) => {
  const courseId = getRouterParam(event, 'id')!
  const quizId = getRouterParam(event, 'quizId')!
  const { user } = await requireUserSession(event)
  await requireQuizActivity(event, courseId, quizId)

  if (user.role === 'student') {
    const student = await requireEnrolledStudent(user.id, courseId)
    const activity = await requireQuizActivity(event, courseId, quizId)
    const showScore = canStudentSeeScore(activity as any)
    const rows = await db.select().from(quizAttempts)
      .where(and(eq(quizAttempts.activityId, quizId), eq(quizAttempts.studentId, student.id)))
      .orderBy(desc(quizAttempts.startedAt))
    return { data: rows.map((row) => showScore ? row : { ...row, score: null }) }
  }

  await requireCourseManager(event, courseId)
  const query = getQuery(event)
  const classId = typeof query.classId === 'string' && query.classId ? query.classId : null
  const rows = await db
    .select({
      id: quizAttempts.id,
      studentId: quizAttempts.studentId,
      studentName: users.name,
      classId: students.classId,
      className: classes.name,
      attemptNumber: quizAttempts.attemptNumber,
      startedAt: quizAttempts.startedAt,
      submittedAt: quizAttempts.submittedAt,
      status: quizAttempts.status,
      score: quizAttempts.score,
    })
    .from(quizAttempts)
    .innerJoin(students, eq(quizAttempts.studentId, students.id))
    .innerJoin(users, eq(students.userId, users.id))
    .leftJoin(classes, eq(students.classId, classes.id))
    .where(classId ? and(eq(quizAttempts.activityId, quizId), eq(students.classId, classId)) : eq(quizAttempts.activityId, quizId))
    .orderBy(desc(quizAttempts.startedAt))
  return { data: rows }
})
