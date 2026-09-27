import { and, asc, eq, inArray } from 'drizzle-orm'
import { activityProgress, students, users, classes, courseClasses, activities, sections, settings } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireCourseManager } from '~~/server/utils/courseAccess'
import { DEFAULT_TIMEZONE } from '~~/shared/timezone.ts'

function csvCell(value: unknown) { return `"${String(value ?? '').replace(/"/g, '""')}"` }

const SUBMIT_TYPES = ['assignment', 'quiz', 'forum']

export default defineEventHandler(async (event) => {
  const courseId = getRouterParam(event, 'id')!
  const course = await requireCourseManager(event, courseId)

  const allActivities = await db
    .select({ id: activities.id, title: activities.title, type: activities.type, dueDate: activities.dueDate, sectionTitle: sections.title })
    .from(activities)
    .innerJoin(sections, eq(activities.sectionId, sections.id))
    .where(eq(sections.courseId, courseId))
    .orderBy(asc(sections.position), asc(activities.position))

  const studentsList = await db
    .select({ id: students.id, name: users.name, nis: students.nis, className: classes.name })
    .from(courseClasses)
    .innerJoin(classes, eq(courseClasses.classId, classes.id))
    .innerJoin(students, eq(students.classId, classes.id))
    .innerJoin(users, eq(students.userId, users.id))
    .where(eq(courseClasses.courseId, courseId))
    .orderBy(asc(classes.name), asc(users.name))

  const activityIds = allActivities.map((a) => a.id)
  const studentIds = studentsList.map((s) => s.id)
  const progressRows = activityIds.length && studentIds.length
    ? await db.select().from(activityProgress).where(and(inArray(activityProgress.activityId, activityIds), inArray(activityProgress.studentId, studentIds)))
    : []
  const progressMap = new Map(progressRows.map((p) => [`${p.studentId}:${p.activityId}`, p]))

  // Nilai sel per aktivitas: "Selesai (85)", "Dikumpulkan (terlambat)", "Belum", dst.
  function cellValue(activity: (typeof allActivities)[number], p: (typeof progressRows)[number] | undefined) {
    const isText = activity.type === 'text'
    const isSubmit = SUBMIT_TYPES.includes(activity.type)
    const done = isText ? !!p?.completedAt : isSubmit ? !!p?.submittedAt : !!p?.viewedAt
    const dueMs = activity.dueDate ? new Date(activity.dueDate).getTime() : null
    const submittedMs = p?.submittedAt ? p.submittedAt.getTime() : null
    const late = !!(dueMs && submittedMs && submittedMs > dueMs)

    let status: string
    if (p?.gradedAt && p.score != null) status = `Dinilai (${p.score})`
    else if (isSubmit) status = p?.submittedAt ? (late ? 'Dikumpulkan (terlambat)' : 'Dikumpulkan') : 'Belum'
    else if (isText) status = p?.completedAt ? 'Selesai' : 'Belum'
    else status = p?.viewedAt ? 'Dilihat' : 'Belum'

    const extra = p?.score != null && !status.includes('(') ? ` (${p.score})` : ''
    return `${status}${extra}`
  }

  const [timezoneSetting] = await db.select({ value: settings.value }).from(settings).where(eq(settings.key, 'school.timezone')).limit(1)
  const timezone = timezoneSetting?.value || DEFAULT_TIMEZONE
  const exportedAt = new Intl.DateTimeFormat('id-ID', {
    timeZone: timezone,
    dateStyle: 'medium',
    timeStyle: 'short',
    hour12: false,
  }).format(new Date())

  // Header: kolom identitas + 1 kolom per aktivitas + ringkasan
  const header: unknown[] = ['Nama', 'NIS', 'Kelas', ...allActivities.map((a) => `${a.sectionTitle} — ${a.title}`), 'Selesai', 'Total', 'Progress (%)']
  const rows: unknown[][] = [['Course', course.name], ['Tanggal export', exportedAt], [], header]

  for (const student of studentsList) {
    const cells = allActivities.map((activity) => cellValue(activity, progressMap.get(`${student.id}:${activity.id}`)))
    const completed = allActivities.filter((activity) => {
      const p = progressMap.get(`${student.id}:${activity.id}`)
      return activity.type === 'text' ? !!p?.completedAt : SUBMIT_TYPES.includes(activity.type) ? !!p?.submittedAt : !!p?.viewedAt
    }).length
    const percent = allActivities.length ? Math.round((completed / allActivities.length) * 100) : 0
    rows.push([student.name, student.nis, student.className, ...cells, completed, allActivities.length, percent])
  }

  setHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
  setHeader(event, 'Content-Disposition', `attachment; filename="progress-${courseId}-${new Date().toISOString().slice(0, 10)}.csv"`)
  return '\uFEFF' + rows.map((row) => row.map(csvCell).join(';')).join('\r\n')
})
