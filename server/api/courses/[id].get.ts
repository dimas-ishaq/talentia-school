import { and, asc, eq, inArray, isNotNull } from 'drizzle-orm'
import { courses, sections, activities, students, courseTeachers, courseClasses, teachers, users, classes, activityProgress } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { findCourseOrThrow, isCourseManager } from '~~/server/utils/courseAccess'
import { canStudentSeeScore } from '~~/server/utils/quiz'
import { isCategoryVisible } from '~~/server/utils/categoryVisibility'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const id = getRouterParam(event, 'id')!
  const courseForAccess = await findCourseOrThrow(id)
  if (user.role === 'student') {
    if (!courseForAccess.isActive || !(await isCategoryVisible(courseForAccess.categoryId))) {
      throw createError({ statusCode: 404, statusMessage: 'Course tidak ditemukan' })
    }
  }

  // Role gate
  if (user.role === 'student') {
    const student = await db.query.students.findFirst({
      where: eq(students.userId, user.id),
      columns: { classId: true },
    })
    if (!student) throw createError({ statusCode: 403, statusMessage: 'Akses ditolak' })
    const link = await db.query.courseClasses.findFirst({
      where: (row, { eq, and }) => and(eq(row.courseId, id), eq(row.classId, student.classId!)),
      columns: { courseId: true },
    })
    if (!link) throw createError({ statusCode: 403, statusMessage: 'Anda tidak terdaftar di course ini' })
  } else if (user.role === 'teacher') {
    if (!(await isCourseManager(user.id, id))) {
      throw createError({ statusCode: 403, statusMessage: 'Anda tidak mengampu course ini' })
    }
  }

  const [courseRow] = await db.select().from(courses).where(eq(courses.id, id)).limit(1)
  if (!courseRow) throw createError({ statusCode: 404, statusMessage: 'Course tidak ditemukan' })

  const [teachersList, classesList, sectionsRows, studentSummary] = await Promise.all([
    db
      .select({ id: teachers.id, name: users.name })
      .from(courseTeachers)
      .innerJoin(teachers, eq(courseTeachers.teacherId, teachers.id))
      .innerJoin(users, eq(teachers.userId, users.id))
      .where(eq(courseTeachers.courseId, id)),
    db
      .select({ id: classes.id, name: classes.name })
      .from(courseClasses)
      .innerJoin(classes, eq(courseClasses.classId, classes.id))
      .where(eq(courseClasses.courseId, id)),
    db
      .select()
      .from(sections)
      .where(eq(sections.courseId, id))
      .orderBy(asc(sections.position)),
    db
      .select({ id: students.id, className: classes.name })
      .from(courseClasses)
      .innerJoin(classes, eq(courseClasses.classId, classes.id))
      .innerJoin(students, eq(students.classId, classes.id))
      .where(eq(courseClasses.courseId, id)),
  ])

  const studentIds = studentSummary.map((student) => student.id)
  const studentClasses = [...new Set(studentSummary.map((student) => student.className))]
  const courseActivityIds = (await db.select({ id: activities.id }).from(activities).innerJoin(sections, eq(activities.sectionId, sections.id)).where(eq(sections.courseId, id))).map((activity) => activity.id)
  const courseScores = studentIds.length && courseActivityIds.length
    ? await db.select({ score: activityProgress.score }).from(activityProgress).where(and(inArray(activityProgress.studentId, studentIds), inArray(activityProgress.activityId, courseActivityIds), isNotNull(activityProgress.gradedAt)))
    : []
  const averageScore = courseScores.length ? courseScores.reduce((sum, row) => sum + (row.score ?? 0), 0) / courseScores.length : null

  // Student progress per activity, only for current student
  let studentProgressMap = new Map<string, { viewedAt: number | null; submittedAt: number | null; completedAt: number | null; score: number | null; submission: string | null; submissionFiles: { name: string; url: string }[]; submissionLink: string | null; feedback: string | null; isLate: boolean; returnedAt: number | null; returnReason: string | null; scorePublishedAt: number | null; gradedAt: number | null }>()
  if (user.role === 'student') {
    const student = await db.query.students.findFirst({
      where: eq(students.userId, user.id),
      columns: { id: true },
    })
    if (student) {
      const progressRows = await db
        .select()
        .from(activityProgress)
        .where(eq(activityProgress.studentId, student.id))
      const parseF = (raw: unknown): { name: string; url: string }[] => {
        try {
          const s = typeof raw === 'string' ? raw : String(raw ?? '')
          if (!s) return []
          const parsed = JSON.parse(s)
          return Array.isArray(parsed) ? parsed.filter((x: any) => x?.url) : []
        } catch { return [] }
      }
      for (const p of progressRows) {
        studentProgressMap.set(p.activityId, {
          viewedAt: (p.viewedAt as Date | null)?.getTime() ?? null,
          submittedAt: (p.submittedAt as Date | null)?.getTime() ?? null,
          completedAt: (p.completedAt as Date | null)?.getTime() ?? null,
          score: p.score as number | null,
          submission: (p.submission as string | null) ?? null,
          submissionFiles: parseF((p as any).submissionFiles),
          submissionLink: (p as any).submissionLink ?? null,
          feedback: (p.feedback as string | null) ?? null,
          isLate: !!(p as any).isLate,
          returnedAt: (p.returnedAt as Date | null)?.getTime() ?? null,
          returnReason: (p.returnReason as string | null) ?? null,
          scorePublishedAt: (p.scorePublishedAt as Date | null)?.getTime() ?? null,
          gradedAt: (p.gradedAt as Date | null)?.getTime() ?? null,
        })
      }
    }
  }

  const isStudent = user.role === 'student'
  const visibleSections = isStudent ? sectionsRows.filter((sec) => sec.isVisible) : sectionsRows

  const sectionData = await Promise.all(
    visibleSections.map(async (sec) => {
      const acts = await db
        .select()
        .from(activities)
        .where(eq(activities.sectionId, sec.id))
        .orderBy(asc(activities.position))
      // Siswa hanya melihat activity yang ditampilkan, dan materi teks harus sudah diterbitkan.
      const visibleActs = isStudent
        ? acts.filter((a) => a.isVisible && (a.type !== 'text' || a.status === 'published'))
        : acts
      return {
        ...sec,
        activities: visibleActs.map((a) => {
          // Jangan pernah bocorkan hash kata sandi ke client.
          const { quizPassword, ...rest } = a
          const progress = studentProgressMap.get(a.id) ?? null
          // Fase 3: nilai activity hanya terlihat setelah guru publish.
          // Quiz tetap pakai scoreVisibility (setelah ditutup / tidak pernah).
          const scoreVisible = a.type === 'quiz'
            ? canStudentSeeScore(a)
            : !progress || progress.score == null || !!progress.scorePublishedAt
          return {
            ...rest,
            hasPassword: !!quizPassword,
            progress: isStudent && progress && !scoreVisible
              ? { ...progress, score: null, feedback: null }
              : progress,
          } as any
        }),
      }
    }),
  )

  return {
    data: {
      ...courseRow,
      teachers: teachersList,
      classes: classesList,
      sections: sectionData,
      summary: {
        studentCount: studentSummary.length,
        studentClasses,
        averageScore,
      },
    },
  }
})