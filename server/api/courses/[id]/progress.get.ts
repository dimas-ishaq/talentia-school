import { and, eq, asc, inArray } from 'drizzle-orm'
import { activityProgress, students, users, classes, courseClasses, activities, sections } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireCourseManager } from '~~/server/utils/courseAccess'

export default defineEventHandler(async (event) => {
  const courseId = getRouterParam(event, 'id')!
  await requireCourseManager(event, courseId)

  // All activities in the course, ordered
  const allActivities = await db
    .select({
      id: activities.id,
      sectionId: activities.sectionId,
      title: activities.title,
      type: activities.type,
      position: activities.position,
      points: activities.points,
      linkCompletionRule: activities.linkCompletionRule,
      dueDate: activities.dueDate,
      sectionTitle: sections.title,
      sectionPosition: sections.position,
    })
    .from(activities)
    .innerJoin(sections, eq(activities.sectionId, sections.id))
    .where(eq(sections.courseId, courseId))
    .orderBy(asc(sections.position), asc(activities.position))

  // All students in assigned classes
  const studentsList = await db
    .select({
      id: students.id,
      name: users.name,
      nis: students.nis,
      classId: students.classId,
      className: classes.name,
    })
    .from(courseClasses)
    .innerJoin(classes, eq(courseClasses.classId, classes.id))
    .innerJoin(students, eq(students.classId, classes.id))
    .innerJoin(users, eq(students.userId, users.id))
    .where(eq(courseClasses.courseId, courseId))
    .orderBy(asc(classes.name), asc(users.name))

  // All progress rows for these students in this course
  const activityIds = allActivities.map((a) => a.id)
  const studentIds = studentsList.map((s) => s.id)
  let progressRows: typeof activityProgress.$inferSelect[] = []
  if (activityIds.length && studentIds.length) {
    progressRows = await db
      .select()
      .from(activityProgress)
      .where(
        and(
          inArray(activityProgress.activityId, activityIds),
          inArray(activityProgress.studentId, studentIds),
        ),
      )
  }
  const progressMap = new Map<string, typeof progressRows[0]>()
  for (const p of progressRows) {
    progressMap.set(`${p.studentId}:${p.activityId}`, p)
  }

  return {
    data: {
      activities: allActivities,
      students: studentsList.map((s) => ({
        ...s,
        progress: allActivities.map((act) => {
          const p = progressMap.get(`${s.id}:${act.id}`)
          const dueMs = act.dueDate ? new Date(act.dueDate).getTime() : null
          const submittedMs = p?.submittedAt ? p.submittedAt.getTime() : null
          const late = !!(dueMs && submittedMs && submittedMs > dueMs)
          return {
            activityId: act.id,
            viewed: !!p?.viewedAt,
            completed: !!p?.completedAt,
            submitted: !!p?.submittedAt,
            graded: !!p?.gradedAt,
            late,
            submittedAt: submittedMs,
            score: p?.score ?? null,
            submission: p?.submission ?? null,
            feedback: p?.feedback ?? null,
          }
        }),
      })),
    },
  }
})