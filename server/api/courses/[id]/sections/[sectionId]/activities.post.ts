import { eq } from 'drizzle-orm'
import bcrypt from 'bcrypt'
import { z } from 'zod'
import { activities, sections } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireCourseManager } from '~~/server/utils/courseAccess'

function assertValidDueDate(v: string | null | undefined): void {
  if (!v || !String(v).trim()) return
  if (!Number.isFinite(new Date(String(v).trim()).getTime())) throw createError({ statusCode: 400, statusMessage: 'Tenggat tidak valid (format ISO/WIB YYYY-MM-DD HH:mm).' })
}

const schema = z.object({
  type: z.enum(['text', 'file', 'video', 'quiz', 'assignment', 'forum', 'presentation', 'link']),
  title: z.string().trim().min(1, 'Judul activity wajib diisi').max(200),
  content: z.string().trim().max(10000).optional().default(''),
  url: z.string().trim().max(500).optional().default(''),
  objectives: z.array(z.string().trim().min(1).max(300)).max(20).optional().default([]),
  readingMinutes: z.number().int().min(1).max(600).nullable().optional(),
  attachments: z.array(z.object({ name: z.string().max(200), url: z.string().max(500), kind: z.string().max(30) })).max(20).optional().default([]),
  points: z.number().int().min(0).max(1000).nullable().optional(),
  maxPoint: z.number().min(0).max(10000).optional().default(100),
  passingScore: z.number().min(0).max(100).nullable().optional(),
  allowLateSubmission: z.boolean().optional(),
  durationMinutes: z.number().int().min(0).max(1440).nullable().optional(),
  openAt: z.string().trim().nullable().optional(),
  closeAt: z.string().trim().nullable().optional(),
  maxAttempts: z.number().int().min(0).max(10).nullable().optional(),
  examMode: z.boolean().optional().default(false),
  fullscreenMode: z.boolean().optional().default(false),
  quizPassword: z.string().max(200).optional().default(''),
  quizInstructions: z.string().max(10000).optional().default(''),
  status: z.enum(['draft', 'published']).optional().default('draft'),
  scoreVisibility: z.enum(['immediate', 'after_close', 'never']).optional().default('immediate'),
  reviewMode: z.enum(['immediate', 'after_close', 'never']).optional().default('immediate'),
  dueDate: z.string().trim().nullable().optional(),
  position: z.number().int().min(0).optional(),
  isRequired: z.boolean().optional().default(true),
  isVisible: z.boolean().optional().default(true),
  forumRequirePost: z.boolean().optional().default(false),
  forumRequireReply: z.boolean().optional().default(false),
  forumCompletionRule: z.enum(['view', 'post', 'reply']).optional().default('view'),
  linkCompletionRule: z.enum(['view', 'complete']).optional().default('view'),
  linkOpenInNewTab: z.boolean().optional().default(true),
  presentationSource: z.enum(['file', 'link']).optional(),
  presentationFileUrl: z.string().trim().max(500).optional().default(''),
  presentationOriginalUrl: z.string().trim().max(500).optional().default(''),
  presentationPageCount: z.number().int().min(0).nullable().optional(),
})

export default defineEventHandler(async (event) => {
  const courseId = getRouterParam(event, 'id')!
  const sectionId = getRouterParam(event, 'sectionId')!
  const [section] = await db.select().from(sections).where(eq(sections.id, sectionId)).limit(1)
  if (!section || section.courseId !== courseId) {
    throw createError({ statusCode: 404, statusMessage: 'Section tidak ditemukan di course ini' })
  }
  await requireCourseManager(event, courseId)

  const body = schema.parse(await readBody(event))
  if (body.type === 'link' && !/^https?:\/\/\S+$/i.test(body.url)) throw createError({ statusCode: 400, statusMessage: 'URL link harus diawali http:// atau https://' })
  assertValidDueDate(body.dueDate)
  if (body.type === 'quiz') {
    if (body.maxPoint < 1) throw createError({ statusCode: 400, statusMessage: 'Nilai maksimum quiz minimal 1' })
    if (body.durationMinutes != null && body.durationMinutes < 1) throw createError({ statusCode: 400, statusMessage: 'Durasi quiz minimal 1 menit' })
    if (body.maxAttempts != null && body.maxAttempts < 1) throw createError({ statusCode: 400, statusMessage: 'Maksimal percobaan minimal 1' })
    if (body.openAt && body.closeAt && new Date(body.closeAt).getTime() <= new Date(body.openAt).getTime()) throw createError({ statusCode: 400, statusMessage: 'Waktu tutup harus setelah waktu buka' })
    if ((body.scoreVisibility === 'after_close' || body.reviewMode === 'after_close') && !body.closeAt) throw createError({ statusCode: 400, statusMessage: 'Waktu tutup wajib diisi untuk aturan setelah quiz ditutup' })
  }
  const positionMax = await db.select({ position: activities.position }).from(activities).where(eq(activities.sectionId, sectionId))
  const nextPos = body.position ?? (positionMax.length ? Math.max(...positionMax.map((p) => p.position)) + 1 : 1)

  const activityId = crypto.randomUUID()
  await db.insert(activities).values({
    id: activityId,
    sectionId,
    type: body.type,
    title: body.title,
    content: body.content || null,
    url: body.url || null,
    objectives: body.objectives.length ? JSON.stringify(body.objectives) : null,
    readingMinutes: body.readingMinutes ?? null,
    attachments: body.attachments.length ? JSON.stringify(body.attachments) : null,
    points: body.points ?? null,
    maxPoint: body.maxPoint ?? 100,
    passingScore: body.type === 'quiz' ? body.passingScore ?? null : null,
    allowLateSubmission: body.type === 'assignment' ? body.allowLateSubmission ?? true : false,
    durationMinutes: body.durationMinutes ?? null,
    openAt: body.openAt || null,
    closeAt: body.closeAt || null,
    // Default quiz: siswa mendapat satu kesempatan. Kirim null hanya bila guru memilih tanpa batas.
    maxAttempts: body.type === 'quiz' && body.maxAttempts === undefined ? 1 : body.maxAttempts ?? null,
    examMode: body.examMode ?? false,
    fullscreenMode: body.fullscreenMode ?? false,
    quizPassword: body.quizPassword ? await bcrypt.hash(body.quizPassword, 10) : null,
    quizInstructions: body.quizInstructions || null,
    status: body.status ?? 'draft',
    scoreVisibility: body.scoreVisibility ?? 'immediate',
    reviewMode: body.reviewMode ?? 'immediate',
    dueDate: body.dueDate && body.dueDate.trim() ? body.dueDate.trim() : null,
    position: nextPos,
    isRequired: body.isRequired,
    isVisible: body.isVisible,
    forumRequirePost: body.type === 'forum' && body.forumRequirePost,
    forumRequireReply: body.type === 'forum' && body.forumRequireReply,
    forumCompletionRule: body.type === 'forum' ? body.forumCompletionRule : 'view',
    linkCompletionRule: body.type === 'link' ? body.linkCompletionRule : 'view',
    linkOpenInNewTab: body.type === 'link' ? body.linkOpenInNewTab : true,
    presentationSource: body.type === 'presentation' ? body.presentationSource ?? null : null,
    presentationFileUrl: body.type === 'presentation' ? body.presentationFileUrl || null : null,
    presentationOriginalUrl: body.type === 'presentation' ? body.presentationOriginalUrl || null : null,
    presentationPageCount: body.type === 'presentation' ? body.presentationPageCount ?? null : null,
  })

  return { success: true, data: { id: activityId } }
})
