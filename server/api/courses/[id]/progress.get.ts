import { and, asc, eq, inArray } from 'drizzle-orm'
import { activities, activityProgress, courseClasses, students, users, classes, sections } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireCourseManager } from '~~/server/utils/courseAccess'

export default defineEventHandler(async (event) => {
  const courseId = getRouterParam(event, 'id')!
  await requireCourseManager(event, courseId)

  const allActivities = await db
    .select({
      id: activities.id, sectionId: activities.sectionId, title: activities.title, type: activities.type,
      position: activities.position, points: activities.points, maxPoint: activities.maxPoint,
      passingScore: activities.passingScore, allowLateSubmission: activities.allowLateSubmission,
      linkCompletionRule: activities.linkCompletionRule, forumCompletionRule: activities.forumCompletionRule,
      forumRequirePost: activities.forumRequirePost, forumRequireReply: activities.forumRequireReply,
      isRequired: activities.isRequired, dueDate: activities.dueDate, closeAt: activities.closeAt,
      sectionTitle: sections.title, sectionPosition: sections.position,
    })
    .from(activities).innerJoin(sections, eq(activities.sectionId, sections.id))
    .where(eq(sections.courseId, courseId)).orderBy(asc(sections.position), asc(activities.position))

  const studentsList = await db.select({ id: students.id, name: users.name, nis: students.nis, classId: students.classId, className: classes.name })
    .from(courseClasses).innerJoin(classes, eq(courseClasses.classId, classes.id))
    .innerJoin(students, eq(students.classId, classes.id)).innerJoin(users, eq(students.userId, users.id))
    .where(eq(courseClasses.courseId, courseId)).orderBy(asc(classes.name), asc(users.name))

  const ids = allActivities.map(a => a.id); const sids = studentsList.map(s => s.id)
  const rows = ids.length && sids.length ? await db.select().from(activityProgress)
    .where(and(inArray(activityProgress.activityId, ids), inArray(activityProgress.studentId, sids))) : []
  const map = new Map(rows.map(p => [`${p.studentId}:${p.activityId}`, p]))

  function parseSubmissionFiles(raw: unknown): { name: string; url: string }[] {
    try {
      if (!raw) return []
      const parsed = typeof raw === 'string' ? JSON.parse(raw as string) : raw
      return Array.isArray(parsed) ? parsed.filter((x: any) => x?.url) : []
    } catch { return [] }
  }

  return {
    data: {
      activities: allActivities,
      students: studentsList.map(s => ({
        ...s,
        progress: allActivities.map(act => {
          const p = map.get(`${s.id}:${act.id}`) as any
          return {
            activityId: act.id, viewed: !!p?.viewedAt, completed: !!p?.completedAt, submitted: !!p?.submittedAt,
            graded: !!p?.gradedAt, published: !!p?.scorePublishedAt, late: !!p?.isLate,
            returned: !!p?.returnedAt, returnReason: p?.returnReason ?? null,
            submittedAt: p?.submittedAt ? new Date(p.submittedAt).getTime() : null,
            score: p?.score ?? null, submission: p?.submission ?? null, feedback: p?.feedback ?? null,
            submissionLink: p?.submissionLink ?? null,
            submissionFiles: parseSubmissionFiles(p?.submissionFiles),
          }
        }),
      })),
    },
  }
})
