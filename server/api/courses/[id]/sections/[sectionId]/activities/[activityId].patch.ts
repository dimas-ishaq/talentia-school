import { eq } from 'drizzle-orm'
import bcrypt from 'bcrypt'
import { z } from 'zod'
import { activities } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireCourseManager } from '~~/server/utils/courseAccess'
import { regradeQuiz } from '~~/server/utils/itemAnalysis'

const schema = z.object({
  type: z.enum(['text', 'file', 'video', 'quiz', 'assignment', 'forum', 'presentation', 'link']).optional(),
  title: z.string().trim().min(1).max(200).optional(),
  content: z.string().trim().max(10000).optional(),
  url: z.string().trim().max(500).optional(),
  objectives: z.array(z.string().trim().min(1).max(300)).max(20).optional(),
  readingMinutes: z.number().int().min(1).max(600).nullable().optional(),
  attachments: z.array(z.object({ name: z.string().max(200), url: z.string().max(500), kind: z.string().max(30) })).max(20).optional(),
  points: z.number().int().min(0).max(1000).nullable().optional(),
  maxPoint: z.number().min(0).max(10000).optional(),
  durationMinutes: z.number().int().min(0).max(1440).nullable().optional(),
  openAt: z.string().trim().nullable().optional(),
  closeAt: z.string().trim().nullable().optional(),
  maxAttempts: z.number().int().min(0).max(10).nullable().optional(),
  examMode: z.boolean().optional(),
  fullscreenMode: z.boolean().optional(),
  quizPassword: z.string().max(200).optional(),
  quizInstructions: z.string().max(10000).optional(),
  status: z.enum(['draft', 'published']).optional(),
  scoreVisibility: z.enum(['immediate', 'after_close', 'never']).optional(),
  reviewMode: z.enum(['immediate', 'after_close', 'never']).optional(),
  dueDate: z.string().trim().optional(),
  position: z.number().int().min(0).optional(),
  isRequired: z.boolean().optional(),
  isVisible: z.boolean().optional(),
  forumRequirePost: z.boolean().optional(),
  forumRequireReply: z.boolean().optional(),
  forumCompletionRule: z.enum(['view', 'post', 'reply']).optional(),
  linkCompletionRule: z.enum(['view', 'complete']).optional(),
  linkOpenInNewTab: z.boolean().optional(),
})

export default defineEventHandler(async (event) => {
  const courseId = getRouterParam(event, 'id')!
  const activityId = getRouterParam(event, 'activityId')!
  await requireCourseManager(event, courseId)
  const body = schema.parse(await readBody(event))
  if (body.type === 'link' && body.url !== undefined && !/^https?:\/\/\S+$/.test(body.url)) throw createError({ statusCode: 400, statusMessage: 'URL link harus diawali http:// atau https://' })
  if (body.type === 'quiz') {
    if (body.maxPoint !== undefined && body.maxPoint < 1) throw createError({ statusCode: 400, statusMessage: 'Nilai maksimum quiz minimal 1' })
    if (body.durationMinutes != null && body.durationMinutes < 1) throw createError({ statusCode: 400, statusMessage: 'Durasi quiz minimal 1 menit' })
    if (body.maxAttempts != null && body.maxAttempts < 1) throw createError({ statusCode: 400, statusMessage: 'Maksimal percobaan minimal 1' })
    if (body.openAt && body.closeAt && new Date(body.closeAt).getTime() <= new Date(body.openAt).getTime()) throw createError({ statusCode: 400, statusMessage: 'Waktu tutup harus setelah waktu buka' })
    if ((body.scoreVisibility === 'after_close' || body.reviewMode === 'after_close') && !body.closeAt) throw createError({ statusCode: 400, statusMessage: 'Waktu tutup wajib diisi untuk aturan setelah quiz ditutup' })
  }

  const updateData: Record<string, any> = {}
  if (body.type !== undefined) updateData.type = body.type
  if (body.title !== undefined) updateData.title = body.title
  if (body.content !== undefined) updateData.content = body.content || null
  if (body.url !== undefined) updateData.url = body.url || null
  if (body.objectives !== undefined) updateData.objectives = body.objectives.length ? JSON.stringify(body.objectives) : null
  if (body.readingMinutes !== undefined) updateData.readingMinutes = body.readingMinutes
  if (body.attachments !== undefined) updateData.attachments = body.attachments.length ? JSON.stringify(body.attachments) : null
  if (body.points !== undefined) updateData.points = body.points
  if (body.maxPoint !== undefined) updateData.maxPoint = body.maxPoint
  if (body.durationMinutes !== undefined) updateData.durationMinutes = body.durationMinutes
  if (body.openAt !== undefined) updateData.openAt = body.openAt || null
  if (body.closeAt !== undefined) updateData.closeAt = body.closeAt || null
  if (body.maxAttempts !== undefined) updateData.maxAttempts = body.maxAttempts
  if (body.examMode !== undefined) updateData.examMode = body.examMode
  if (body.fullscreenMode !== undefined) updateData.fullscreenMode = body.fullscreenMode
  if (body.quizInstructions !== undefined) updateData.quizInstructions = body.quizInstructions || null
  if (body.quizPassword !== undefined) updateData.quizPassword = body.quizPassword ? await bcrypt.hash(body.quizPassword, 10) : null
  if (body.status !== undefined) updateData.status = body.status
  if (body.scoreVisibility !== undefined) updateData.scoreVisibility = body.scoreVisibility
  if (body.reviewMode !== undefined) updateData.reviewMode = body.reviewMode
  if (body.dueDate !== undefined) updateData.dueDate = body.dueDate && body.dueDate.trim() ? body.dueDate.trim() : null
  if (body.position !== undefined) updateData.position = body.position
  if (body.isRequired !== undefined) updateData.isRequired = body.isRequired
  if (body.isVisible !== undefined) updateData.isVisible = body.isVisible
  if (body.forumRequirePost !== undefined) updateData.forumRequirePost = body.forumRequirePost
  if (body.forumRequireReply !== undefined) updateData.forumRequireReply = body.forumRequireReply
  if (body.forumCompletionRule !== undefined) updateData.forumCompletionRule = body.forumCompletionRule
  if (body.linkCompletionRule !== undefined) updateData.linkCompletionRule = body.linkCompletionRule
  if (body.linkOpenInNewTab !== undefined) updateData.linkOpenInNewTab = body.linkOpenInNewTab

  if (Object.keys(updateData).length) {
    const [updated] = await db.update(activities).set(updateData).where(eq(activities.id, activityId)).returning({ id: activities.id })
    if (!updated) throw createError({ statusCode: 404, statusMessage: 'Activity tidak ditemukan' })
    if (body.type === 'quiz' && body.maxPoint !== undefined) await regradeQuiz(activityId)
  }
  return { success: true }
})
