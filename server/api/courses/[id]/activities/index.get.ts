// server/api/courses/[id]/activities/index.get.ts
// Daftar aktivitas pada course. Dengan ?pending=true → hanya submission yang belum dinilai.
import { and, eq, inArray } from 'drizzle-orm'
import { activities, sections, activityProgress, students, users, classes, courseClasses } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireCourseManager } from '~~/server/utils/courseAccess'

const SUBMIT_TYPES = ['assignment', 'forum']

export default defineEventHandler(async (event) => {
  const courseId = getRouterParam(event, 'id')!
  await requireCourseManager(event, courseId)
  const query = getQuery(event)

  const acts = await db
    .select({
      id: activities.id,
      type: activities.type,
      title: activities.title,
      sectionTitle: sections.title,
      points: activities.points,
      maxPoint: activities.maxPoint,
      dueDate: activities.dueDate,
      allowLateSubmission: activities.allowLateSubmission,
    })
    .from(activities)
    .innerJoin(sections, eq(activities.sectionId, sections.id))
    .where(eq(sections.courseId, courseId))

  if (query.pending !== 'true') {
    return { data: acts }
  }

  const submitActs = acts.filter((a) => SUBMIT_TYPES.includes(a.type))
  if (!submitActs.length) return { data: [] }

  const progressRows = await db
    .select()
    .from(activityProgress)
    .where(inArray(activityProgress.activityId, submitActs.map((a) => a.id)))

  const actMap = new Map(submitActs.map((a) => [a.id, a]))
  const studentIds = [...new Set(progressRows.map((p) => p.studentId))]
  const studentRows = studentIds.length
    ? await db
        .select({ id: students.id, name: users.name, nis: students.nis, className: classes.name })
        .from(students)
        .innerJoin(users, eq(students.userId, users.id))
        .leftJoin(classes, eq(students.classId, classes.id))
        .where(inArray(students.id, studentIds))
    : []
  const studentMap = new Map(studentRows.map((s) => [s.id, s]))

  const parseFiles = (raw: string | null): { name: string; url: string }[] => {
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
      return Array.isArray(parsed) ? parsed.filter((x) => x?.url) : []
    } catch { return [] }
  }

  const data = progressRows
    .filter((p) => p.submittedAt && (!p.gradedAt || p.returnedAt))
    .map((p) => {
      const act = actMap.get(p.activityId)!
      const stu = studentMap.get(p.studentId)
      return {
        activityId: p.activityId,
        studentId: p.studentId,
        studentName: stu?.name ?? 'Siswa',
        nis: stu?.nis ?? '',
        className: stu?.className ?? '',
        type: act.type,
        title: act.title,
        sectionTitle: act.sectionTitle,
        points: act.points,
        maxPoint: act.maxPoint,
        dueDate: act.dueDate,
        allowLateSubmission: act.allowLateSubmission,
        isLate: p.isLate,
        submission: p.submission,
        submissionLink: p.submissionLink ?? null,
        submissionFiles: parseFiles(p.submissionFiles),
        returnedAt: p.returnedAt ?? null,
        returnReason: p.returnReason ?? null,
        score: p.score ?? null,
        feedback: p.feedback ?? null,
        submittedAt: p.submittedAt,
      }
    })

  return { data }
})
