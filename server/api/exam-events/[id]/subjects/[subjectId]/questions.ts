// GET  /api/exam-events/[id]/subjects/[subjectId]/questions — daftar soal ujian mapel
// POST — tambah soal dari paket/bank/manual ke activity mapel
import { z } from 'zod'
import { eq, sql } from 'drizzle-orm'
import {
  examEventSubjects, quizQuestions, questionBank, questionOptions, questionPackages,
} from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireExamManager } from '~~/server/utils/exam'

const schema = z.object({
  packageId: z.string().optional(),
  questions: z.array(z.object({
    bankQuestionId: z.string().nullable().optional(),
    type: z.enum(['multiple_choice', 'essay']).optional(),
    question: z.string().trim().min(1).max(10000).optional(),
    explanation: z.string().trim().max(5000).nullable().optional(),
    points: z.number().min(0).max(1000).optional(),
    options: z.array(z.object({ label: z.string(), text: z.string(), isCorrect: z.boolean() })).optional(),
  })).optional().default([]),
})

async function getSubject(eventId: string, subjectId: string) {
  const subj = await db.query.examEventSubjects.findFirst({ where: eq(examEventSubjects.id, subjectId) })
  if (!subj || subj.eventId !== eventId) throw createError({ statusCode: 404, statusMessage: 'Mapel tidak ditemukan di event ini' })
  return subj
}

export default defineEventHandler(async (event) => {
  const eventId = String(getRouterParam(event, 'id') ?? '')
  const subjectId = String(getRouterParam(event, 'subjectId') ?? '')
  await requireExamManager(event, eventId)
  const subj = await getSubject(eventId, subjectId)

  if (getMethod(event) === 'GET') {
    const rows = await db.select().from(quizQuestions).where(eq(quizQuestions.activityId, subj.activityId)).orderBy(quizQuestions.position)
    return { data: rows.map((q) => ({ ...q, options: q.optionsJson ? JSON.parse(q.optionsJson) : [] })) }
  }

  const body = schema.parse(await readBody(event))

  if (body.packageId) {
    const pkg = await db.query.questionPackages.findFirst({ where: eq(questionPackages.id, body.packageId) })
    if (!pkg || !pkg.isActive) throw createError({ statusCode: 404, statusMessage: 'Paket soal tidak ditemukan' })
    const bankRows = await db.query.questionBank.findMany({ where: eq(questionBank.packageId, body.packageId) })
    const active = bankRows.filter((r) => r.isActive)
    if (!active.length) throw createError({ statusCode: 404, statusMessage: 'Paket ini belum memiliki soal aktif' })
    body.questions = active.map((b) => ({ bankQuestionId: b.id }))
  }
  if (!body.questions.length) throw createError({ statusCode: 400, statusMessage: 'Tidak ada soal untuk ditambahkan' })

  const [maxRow] = await db.select({ max: sql<number>`coalesce(max(${quizQuestions.position}), 0)` }).from(quizQuestions).where(eq(quizQuestions.activityId, subj.activityId))
  let nextPos = (maxRow?.max ?? 0) + 1
  const created: string[] = []

  for (const q of body.questions) {
    let type: 'multiple_choice' | 'essay' = q.type ?? 'essay'
    let questionText = q.question ?? ''
    let optionsJson: string | null = null
    let explanation = q.explanation ?? null
    let points = q.points ?? 1
    if (q.bankQuestionId) {
      const bank = await db.query.questionBank.findFirst({ where: eq(questionBank.id, q.bankQuestionId) })
      if (!bank || !bank.isActive) throw createError({ statusCode: 404, statusMessage: 'Soal bank tidak ditemukan' })
      type = bank.type
      questionText = bank.question
      explanation = bank.explanation
      points = q.points ?? bank.defaultPoints
      if (bank.type === 'multiple_choice') {
        const opts = await db.select().from(questionOptions).where(eq(questionOptions.questionId, bank.id))
        optionsJson = JSON.stringify(opts.map((o) => ({ id: o.id, label: o.label, text: o.text, isCorrect: o.isCorrect })))
      }
    } else if (q.options?.length) {
      optionsJson = JSON.stringify(q.options.map((o) => ({ id: crypto.randomUUID(), label: o.label, text: o.text, isCorrect: o.isCorrect })))
    }
    if (!questionText) throw createError({ statusCode: 400, statusMessage: 'Pertanyaan wajib diisi' })
    const id = crypto.randomUUID()
    await db.insert(quizQuestions).values({ id, activityId: subj.activityId, bankQuestionId: q.bankQuestionId ?? null, position: nextPos++, points, type, question: questionText, explanation, optionsJson, targetClassIds: null })
    created.push(id)
  }
  return { success: true, ids: created }
})
