import { and, eq } from 'drizzle-orm'
import { activities, sections } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireCourseManager } from '~~/server/utils/courseAccess'

export default defineEventHandler(async (event) => {
  const courseId = getRouterParam(event, 'id')!
  const sectionId = getRouterParam(event, 'sectionId')!
  const activityId = getRouterParam(event, 'activityId')!
  await requireCourseManager(event, courseId)

  const [section] = await db.select({ id: sections.id })
    .from(sections)
    .where(and(eq(sections.id, sectionId), eq(sections.courseId, courseId)))
    .limit(1)
  if (!section) throw createError({ statusCode: 404, statusMessage: 'Section tidak ditemukan' })

  const [source] = await db.select().from(activities).where(and(eq(activities.id, activityId), eq(activities.sectionId, sectionId))).limit(1)
  if (!source) throw createError({ statusCode: 404, statusMessage: 'Materi tidak ditemukan' })
  if (source.type !== 'text') throw createError({ statusCode: 400, statusMessage: 'Hanya materi teks yang dapat diduplikasi' })

  const rows = await db.select({ position: activities.position }).from(activities).where(eq(activities.sectionId, sectionId))
  const position = rows.length ? Math.max(...rows.map((row) => row.position)) + 1 : 1
  const id = crypto.randomUUID()

  await db.insert(activities).values({
    id,
    sectionId,
    type: 'text',
    title: `Salinan - ${source.title}`.slice(0, 200),
    content: source.content,
    url: null,
    objectives: null,
    readingMinutes: source.readingMinutes,
    attachments: source.attachments,
    points: source.points,
    maxPoint: source.maxPoint,
    dueDate: source.dueDate,
    position,
    isRequired: source.isRequired,
    isVisible: false,
    status: 'draft',
    forumRequirePost: false,
    forumRequireReply: false,
    forumCompletionRule: 'view',
  })

  return { success: true, data: { id } }
})
