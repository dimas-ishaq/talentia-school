// Grid nilai per activity. Hanya guru/admin course yang dapat membaca.
import { and, asc, eq, inArray } from 'drizzle-orm'
import { activities, activityProgress, courseClasses, students, users, classes, sections } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireCourseManager } from '~~/server/utils/courseAccess'

export default defineEventHandler(async (event) => {
  const courseId = getRouterParam(event, 'id')!
  await requireCourseManager(event, courseId)
  const acts = await db.select({ id: activities.id, title: activities.title, type: activities.type, points: activities.points, maxPoint: activities.maxPoint, dueDate: activities.dueDate, sectionTitle: sections.title })
    .from(activities).innerJoin(sections, eq(activities.sectionId, sections.id)).where(eq(sections.courseId, courseId)).orderBy(asc(sections.position), asc(activities.position))
  const roster = await db.select({ id: students.id, name: users.name, nis: students.nis, className: classes.name })
    .from(courseClasses).innerJoin(classes, eq(courseClasses.classId, classes.id)).innerJoin(students, eq(students.classId, classes.id)).innerJoin(users, eq(students.userId, users.id))
    .where(eq(courseClasses.courseId, courseId)).orderBy(asc(classes.name), asc(users.name))
  const aIds = acts.map(a => a.id); const sIds = roster.map(s => s.id)
  const rows = aIds.length && sIds.length ? await db.select().from(activityProgress).where(and(inArray(activityProgress.activityId, aIds), inArray(activityProgress.studentId, sIds))) : []
  const map = new Map(rows.map(p => [`${p.studentId}:${p.activityId}`, p]))
  return { data: { activities: acts, students: roster.map(s => ({ ...s, scores: acts.map(a => { const p = map.get(`${s.id}:${a.id}`); return { activityId: a.id, score: p?.score ?? null, graded: !!p?.gradedAt, published: !!p?.scorePublishedAt, late: !!p?.isLate, returned: !!p?.returnedAt, feedback: p?.feedback ?? null } }) })) } }
})
