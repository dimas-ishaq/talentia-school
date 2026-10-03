import { and, asc, eq, inArray } from 'drizzle-orm'
import { activities, activityProgress, courseClasses, students, users, classes, sections, settings } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireCourseManager } from '~~/server/utils/courseAccess'
import { DEFAULT_TIMEZONE } from '~~/shared/timezone.ts'
import { requireOrganization } from '~~/server/utils/tenant'

const c = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
const SUBMIT_TYPES = ['assignment', 'quiz', 'forum']

export default defineEventHandler(async (event) => {
  const courseId = getRouterParam(event, 'id')!
  const course = await requireCourseManager(event, courseId)
  const { organization } = await requireOrganization(event)
  const acts = await db.select({ id: activities.id, title: activities.title, type: activities.type, isRequired: activities.isRequired, sectionTitle: sections.title })
    .from(activities).innerJoin(sections, eq(activities.sectionId, sections.id))
    .where(eq(sections.courseId, courseId)).orderBy(asc(sections.position), asc(activities.position))
  const studentsList = await db.select({ id: students.id, name: users.name, nis: students.nis, className: classes.name })
    .from(courseClasses).innerJoin(classes, eq(courseClasses.classId, classes.id))
    .innerJoin(students, eq(students.classId, classes.id)).innerJoin(users, eq(students.userId, users.id))
    .where(eq(courseClasses.courseId, courseId)).orderBy(asc(classes.name), asc(users.name))
  const aIds = acts.map(a => a.id); const sIds = studentsList.map(s => s.id)
  const rows = aIds.length && sIds.length ? await db.select().from(activityProgress)
    .where(and(inArray(activityProgress.activityId, aIds), inArray(activityProgress.studentId, sIds))) : []
  const map = new Map(rows.map(p => [`${p.studentId}:${p.activityId}`, p]))
  const cell = (act: (typeof acts)[number], p: (typeof rows)[number] | undefined) => {
    if (p?.gradedAt && p.score != null) return `Dinilai (${p.score})`
    const late = (p as any)?.isLate ? ' (terlambat)' : ''
    if (SUBMIT_TYPES.includes(act.type)) return p?.submittedAt ? `Dikumpulkan${late}` : 'Belum'
    if (act.type === 'text') return p?.completedAt ? 'Selesai' : 'Belum'
    return p?.viewedAt ? 'Dilihat' : 'Belum'
  }
  const [{ value: tzs } = { value: '' }] = (await db.select({ value: settings.value }).from(settings).where(and(eq(settings.organizationId, organization.id), eq(settings.key, 'school.timezone'))).limit(1)) ?? []
  const exportedAt = new Intl.DateTimeFormat('id-ID', { timeZone: tzs || DEFAULT_TIMEZONE, dateStyle: 'medium', timeStyle: 'short', hour12: false }).format(new Date())
  const header = ['Nama', 'NIS', 'Kelas', ...acts.map(a => `${a.sectionTitle} \u2014 ${a.title}`), 'Wajib selesai', 'Wajib total', 'Progress wajib (%)']
  const out: unknown[][] = [['Course', course.name], ['Tanggal export', exportedAt], [], header]
  const required = acts.filter(a => !!a.isRequired)
  for (const s of studentsList) {
    const cells = acts.map(a => cell(a, map.get(`${s.id}:${a.id}`)))
    const done = required.filter(a => !!map.get(`${s.id}:${a.id}`)?.completedAt).length
    const pct = required.length ? Math.round(done / required.length * 100) : 0
    out.push([s.name, s.nis, s.className, ...cells, done, required.length, pct])
  }
  setHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
  setHeader(event, 'Content-Disposition', `attachment; filename="progress-${courseId}-${new Date().toISOString().slice(0, 10)}.csv"`)
  return '\uFEFF' + out.map(r => r.map(c).join(';')).join('\r\n')
})
