import { eq, and, inArray, asc, sql } from 'drizzle-orm'
import { courses, courseTeachers, courseClasses, teachers, students, sections, activities, activityProgress, categories } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { getHiddenCategoryIds } from '~~/server/utils/categoryVisibility'
import { requireOrganization } from '~~/server/utils/tenant'

// Activity dianggap selesai: text = selesai dibaca, assignment/quiz/forum = dikumpulkan, sisanya = dilihat
const SUBMIT_TYPES = ['assignment', 'quiz', 'forum']
function isActivityDone(type: string, p?: { viewedAt: Date | null; submittedAt: Date | null; completedAt: Date | null }) {
  if (!p) return false
  if (type === 'text') return !!p.completedAt
  return SUBMIT_TYPES.includes(type) ? !!p.submittedAt : !!p.viewedAt
}

export default defineEventHandler(async (event) => {
  const { user, organization } = await requireOrganization(event)

  // Dapatkan id course yang bisa dilihat user
  let courseIds: string[] | undefined
  let studentId: string | null = null
  if (user.role === 'student') {
    const student = await db.query.students.findFirst({
      where: eq(students.userId, user.id),
      columns: { id: true, classId: true },
    })
    studentId = student?.id ?? null
    if (student?.classId) {
      const rows = await db
        .select({ id: courseClasses.courseId })
        .from(courseClasses)
        .where(eq(courseClasses.classId, student.classId))
      courseIds = [...new Set(rows.map((r) => r.id))]
    }
    if (!courseIds?.length) return { data: [] }
  } else if (user.role === 'teacher') {
    const teacher = await db.query.teachers.findFirst({
      where: eq(teachers.userId, user.id),
      columns: { id: true },
    })
    if (teacher) {
      const rows = await db
        .select({ id: courseTeachers.courseId })
        .from(courseTeachers)
        .where(eq(courseTeachers.teacherId, teacher.id))
      courseIds = rows.map((r) => r.id)
    }
    if (!courseIds?.length) return { data: [] }
  }
  // admin: undefined = semua

  const orgFilter = eq(courses.organizationId, organization.id)
  const whereClause =
    courseIds ? and(orgFilter, inArray(courses.id, courseIds)) : orgFilter

  const rows = await db
    .select({
      id: courses.id,
      name: courses.name,
      code: courses.code,
      description: courses.description,
      coverUrl: courses.coverUrl,
      isActive: courses.isActive,
      isSystem: courses.isSystem,
      categoryId: courses.categoryId,
      subjectId: courses.subjectId,
      position: courses.position,
      createdAt: courses.createdAt,
      categoryName: sql<string>`(select ${categories.name} from ${categories} where ${categories.id} = ${courses.categoryId})`.as('cat_name'),
      sectionCount: sql<number>`(select count(*) from ${sections} where ${sections.courseId} = ${courses.id})`.as('sec_count'),
      classCount: sql<number>`(select count(*) from ${courseClasses} where ${courseClasses.courseId} = ${courses.id})`.as('cls_count'),
    })
    .from(courses)
    .where(whereClause)
    .orderBy(asc(courses.position), asc(courses.name))

  // Filter: sembunyikan container sistem (mis. soal ujian) untuk semua role
  let filtered = rows.filter((r) => !r.isSystem)
  if (user.role === 'student') {
    const hiddenCategoryIds = await getHiddenCategoryIds()
    filtered = filtered.filter((r) => {
      if (!r.isActive) return false
      if (!r.categoryId) return true
      return !hiddenCategoryIds.has(r.categoryId)
    })
  } else if (user.role === 'teacher') {
    // Guru tetap melihat course yang diampu, termasuk status nonaktif/hidden.
    // Kategori hidden tidak menghapus course dari daftar guru.
  }

  // Progress keseluruhan per course (khusus siswa)
  let progressByCourse = new Map<string, { total: number; completed: number; percent: number }>()
  if (user.role === 'student' && studentId && filtered.length) {
    const visibleIds = filtered.map((r) => r.id)
    const activityRows = await db
      .select({ id: activities.id, type: activities.type, courseId: sections.courseId })
      .from(activities)
      .innerJoin(sections, eq(activities.sectionId, sections.id))
      .where(and(inArray(sections.courseId, visibleIds), eq(sections.isVisible, true), eq(activities.isVisible, true)))
    const activityIds = activityRows.map((a) => a.id)
    const progressRows = activityIds.length
      ? await db
          .select({ activityId: activityProgress.activityId, viewedAt: activityProgress.viewedAt, submittedAt: activityProgress.submittedAt, completedAt: activityProgress.completedAt })
          .from(activityProgress)
          .where(and(inArray(activityProgress.activityId, activityIds), eq(activityProgress.studentId, studentId)))
      : []
    const doneMap = new Set<string>()
    const progressMap = new Map(progressRows.map((p) => [p.activityId, p]))
    for (const a of activityRows) {
      if (isActivityDone(a.type, progressMap.get(a.id))) doneMap.add(a.id)
    }
    const totals = new Map<string, { total: number; completed: number }>()
    for (const a of activityRows) {
      const t = totals.get(a.courseId) ?? { total: 0, completed: 0 }
      t.total++
      if (doneMap.has(a.id)) t.completed++
      totals.set(a.courseId, t)
    }
    progressByCourse = new Map(
      [...totals].map(([cid, t]) => [cid, { ...t, percent: t.total ? Math.round((t.completed / t.total) * 100) : 0 }]),
    )
    for (const r of filtered) {
      if (!progressByCourse.has(r.id)) progressByCourse.set(r.id, { total: 0, completed: 0, percent: 0 })
    }
  }

  const data = filtered.map((r) => ({ ...r, progress: progressByCourse.get(r.id) ?? { total: 0, completed: 0, percent: 0 } }))

  return { data }
})