import { eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { questionBank, questionOptions, quizQuestions } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireQuizActivity, assertQuizEditable } from '~~/server/utils/quiz'
import { requireCourseManager } from '~~/server/utils/courseAccess'
import { questionPackages } from '~~/server/database/schema'

const schema = z.object({
  packageId: z.string().optional(),
  questions: z.array(z.object({
    bankQuestionId: z.string().nullable().optional(),
    type: z.enum(['multiple_choice', 'essay']).optional(),
    question: z.string().trim().min(1).max(10000).optional(),
    explanation: z.string().trim().max(5000).optional().nullable(),
    points: z.number().min(0).max(1000).optional(),
    options: z.array(z.object({ label: z.string(), text: z.string(), isCorrect: z.boolean() })).optional(),
    targetClassIds: z.array(z.string().uuid()).max(100).nullable().optional(),
  })).optional().default([]),
})

export default defineEventHandler(async (event) => {
  const courseId = getRouterParam(event, 'id')!
  const quizId = getRouterParam(event, 'quizId')!
  await requireCourseManager(event, courseId)
  const { user } = await requireUserSession(event)
  await requireQuizActivity(event, courseId, quizId)
  await assertQuizEditable(quizId)
  const body = schema.parse(await readBody(event))

  // ponytail: ambil dari satu paket soal dulu. Multi-paket ditambahkan saat kebutuhan nyata muncul.
  if (body.packageId) {
    const pkg = await db.query.questionPackages.findFirst({ where: eq(questionPackages.id, body.packageId) })
    if (!pkg || !pkg.isActive) throw createError({ statusCode: 404, statusMessage: 'Paket soal tidak ditemukan' })
    if (pkg.courseId !== courseId) throw createError({ statusCode: 403, statusMessage: 'Paket soal bukan milik course ini' })
    const bankRows = await db.query.questionBank.findMany({ where: eq(questionBank.packageId, body.packageId) })
    const active = bankRows.filter((r) => r.isActive)
    if (!active.length) throw createError({ statusCode: 404, statusMessage: 'Paket ini belum memiliki soal aktif' })
    body.questions = active.map((b) => ({ bankQuestionId: b.id }))
  }
  if (!body.questions.length) throw createError({ statusCode: 400, statusMessage: 'Tidak ada soal untuk ditambahkan' })

  const [maxRow] = await db.select({ max: sql<number>`coalesce(max(${quizQuestions.position}), 0)` }).from(quizQuestions).where(eq(quizQuestions.activityId, quizId))
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
      // Soal harus berasal dari paket milik course quiz ini. Guru sudah lolos requireCourseManager.
      if (bank.packageId) {
        const pkg = await db.query.questionPackages.findFirst({ where: eq(questionPackages.id, bank.packageId), columns: { courseId: true } })
        if (!pkg || pkg.courseId !== courseId) throw createError({ statusCode: 403, statusMessage: 'Anda tidak berhak memakai soal dari paket course lain' })
      } else if (user.role !== 'admin' && bank.createdBy !== user.id) {
        // Soal lama tanpa paket: hanya admin atau pembuatnya.
        throw createError({ statusCode: 403, statusMessage: 'Anda tidak berhak memakai soal bank ini' })
      }
      type = bank.type
      questionText = bank.question
      explanation = bank.explanation
      points = q.points ?? bank.defaultPoints
      if (bank.type === 'multiple_choice') {
        const opts = await db.select().from(questionOptions).where(eq(questionOptions.questionId, bank.id))
        optionsJson = JSON.stringify(opts.map((o) => ({ id: o.id, label: o.label, text: o.text, isCorrect: o.isCorrect })))
      }
    } else if (q.options?.length) {
      // Pastikan setiap opsi punya id stabil agar auto-score PG dapat mencocokkan jawaban.
      optionsJson = JSON.stringify(q.options.map((o) => ({ id: crypto.randomUUID(), label: o.label, text: o.text, isCorrect: o.isCorrect })))
    }
    if (!questionText) throw createError({ statusCode: 400, statusMessage: 'Pertanyaan wajib diisi' })
    if (type === 'multiple_choice') {
      const options = optionsJson ? JSON.parse(optionsJson) as { text: string; isCorrect: boolean }[] : []
      if (options.length < 2) throw createError({ statusCode: 400, statusMessage: 'Pilihan ganda membutuhkan minimal 2 opsi' })
      if (options.some((option) => !option.text.trim())) throw createError({ statusCode: 400, statusMessage: 'Semua teks opsi wajib diisi' })
      if (!options.some((option) => option.isCorrect)) throw createError({ statusCode: 400, statusMessage: 'Tentukan minimal satu jawaban benar' })
    }
    const id = crypto.randomUUID()
    await db.insert(quizQuestions).values({ id, activityId: quizId, bankQuestionId: q.bankQuestionId ?? null, position: nextPos++, points, type, question: questionText, explanation, optionsJson, targetClassIds: q.targetClassIds?.length ? JSON.stringify(q.targetClassIds) : null })
    created.push(id)
  }
  return { success: true, ids: created }
})
