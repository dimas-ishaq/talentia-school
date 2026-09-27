import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { activities, courseClasses, forumDiscussions, forumPosts, sections, students, activityProgress } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { findCourseOrThrow, isCourseManager } from '~~/server/utils/courseAccess'
import { evaluateCompletion } from '~~/server/utils/completion'

const schema = z.object({ content: z.string().trim().min(1).max(5000), discussionId: z.string().uuid(), parentId: z.string().uuid().nullable().optional() })

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const courseId = getRouterParam(event, 'id')!
  const activityId = getRouterParam(event, 'activityId')!
  const body = schema.parse(await readBody(event))
  await findCourseOrThrow(courseId)
  const activity = await db.query.activities.findFirst({ where: eq(activities.id, activityId) })
  if (!activity || activity.type !== 'forum') throw createError({ statusCode: 404, statusMessage: 'Forum tidak ditemukan' })
  const section = await db.query.sections.findFirst({ where: eq(sections.id, activity.sectionId) })
  if (!section || section.courseId !== courseId) throw createError({ statusCode: 404, statusMessage: 'Forum tidak ditemukan' })
  let studentId: string | null = null
  if (user.role === 'student') {
    const student = await db.query.students.findFirst({ where: eq(students.userId, user.id), columns: { id: true, classId: true } })
    const enrolled = student?.classId && await db.query.courseClasses.findFirst({ where: and(eq(courseClasses.courseId, courseId), eq(courseClasses.classId, student.classId)) })
    if (!student || !enrolled) throw createError({ statusCode: 403, statusMessage: 'Anda tidak terdaftar di course ini' })
    studentId = student.id
  } else if (!(await isCourseManager(user.id, courseId))) throw createError({ statusCode: 403, statusMessage: 'Akses ditolak' })
  const discussion = await db.query.forumDiscussions.findFirst({ where: and(eq(forumDiscussions.id, body.discussionId), eq(forumDiscussions.activityId, activityId)) })
  if (!discussion) throw createError({ statusCode: 400, statusMessage: 'Diskusi tidak valid' })
  if (body.parentId) {
    const parent = await db.query.forumPosts.findFirst({ where: and(eq(forumPosts.id, body.parentId), eq(forumPosts.activityId, activityId), eq(forumPosts.discussionId, body.discussionId)) })
    if (!parent) throw createError({ statusCode: 400, statusMessage: 'Post induk tidak valid' })
  }
  const now = new Date()
  const [post] = await db.insert(forumPosts).values({ id: crypto.randomUUID(), activityId, discussionId: body.discussionId, userId: user.id, studentId, parentId: body.parentId ?? null, content: body.content, createdAt: now, updatedAt: now }).returning()

  // Fase 1: forum selesai sesuai forumCompletionRule + forumRequirePost/Reply.
  if (studentId) {
    const mine = await db.query.forumPosts.findMany({ where: and(eq(forumPosts.activityId, activityId), eq(forumPosts.studentId, studentId)) })
    const postCount = mine.filter((p) => !p.parentId).length
    const replyCount = mine.filter((p) => !!p.parentId).length
    const existing = await db.query.activityProgress.findFirst({
      where: and(eq(activityProgress.activityId, activityId), eq(activityProgress.studentId, studentId)),
    })
    const decision = evaluateCompletion({
      activity,
      progress: {
        viewedAt: existing?.viewedAt ?? now,
        submittedAt: existing?.submittedAt ?? now,
        completedAt: existing?.completedAt ?? null,
        score: existing?.score ?? null,
      },
      forumStats: { postCount, replyCount },
    })
    const values = {
      viewedAt: existing?.viewedAt ?? now,
      submittedAt: existing?.submittedAt ?? now,
      completedAt: decision.done ? (existing?.completedAt ?? now) : null,
    }
    if (existing) await db.update(activityProgress).set(values).where(eq(activityProgress.id, existing.id))
    else await db.insert(activityProgress).values({ id: crypto.randomUUID(), activityId, studentId, ...values })
  }

  return { data: post }
})
