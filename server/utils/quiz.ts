// server/utils/quiz.ts — quiz helpers
import { eq, and, asc, count, sql } from 'drizzle-orm'
import { activities, sections, students, courseClasses, questionBank, questionOptions, quizQuestions, quizAttempts, quizAttemptAnswers, activityProgress, quizEvents } from '~~/server/database/schema'
import { evaluateCompletion } from '~~/server/utils/completion'
import { findCourseOrThrow } from '~~/server/utils/courseAccess'
import { requireOrganization } from '~~/server/utils/tenant'
import { db } from '~~/server/utils/db'

/** Throw 404/403 if activity is not a quiz or user lacks access.
 *  Tenant-scoped: course wajib milik organisasi user (lihat findCourseOrThrow). */
export async function requireQuizActivity(event: any, courseId: string, activityId: string) {
  const { organization } = await requireOrganization(event)
  await findCourseOrThrow(courseId, organization.id)
  const activity = await db.query.activities.findFirst({ where: eq(activities.id, activityId) })
  if (!activity) throw createError({ statusCode: 404, statusMessage: 'Activity tidak ditemukan' })
  if (activity.type !== 'quiz') throw createError({ statusCode: 400, statusMessage: 'Activity bukan quiz' })
  const section = await db.query.sections.findFirst({ where: eq(sections.id, activity.sectionId) })
  if (!section || section.courseId !== courseId) throw createError({ statusCode: 404, statusMessage: 'Quiz tidak ditemukan di course ini' })
  return activity
}

/** Get student row from userId, throw if missing or not enrolled */
/** Quiz dengan submission terkunci: soal & bobot tidak boleh diubah. */
export async function assertQuizEditable(activityId: string) {
  const [row] = await db.select({ total: count() }).from(quizAttempts).where(eq(quizAttempts.activityId, activityId))
  if ((row?.total ?? 0) > 0) {
    throw createError({ statusCode: 409, statusMessage: 'Quiz terkunci karena sudah memiliki submission' })
  }
}

export async function requireEnrolledStudent(userId: string, courseId: string) {
  const course = await findCourseOrThrow(courseId)
  if (!course.organizationId) throw createError({ statusCode: 503, statusMessage: 'Course tanpa organisasi' })
  const student = await db.query.students.findFirst({ where: and(eq(students.userId, userId), eq(students.organizationId, course.organizationId)) })
  if (!student?.classId || !student.organizationId) throw createError({ statusCode: 403, statusMessage: 'Data siswa tidak ditemukan' })
  // Enrollment tidak menyimpan organization_id; student + course tenant harus sama.
  const enrolled = await db.query.courseClasses.findFirst({
    where: and(eq(courseClasses.courseId, courseId), eq(courseClasses.classId, student.classId)),
  })
  if (!enrolled) throw createError({ statusCode: 403, statusMessage: 'Anda tidak terdaftar di course ini' })
  return student
}

/** Build snapshot of quiz questions (options parsed from optionsJson) */
export async function buildAttemptSnapshot(activityId: string) {
  const rows = await db.select().from(quizQuestions).where(eq(quizQuestions.activityId, activityId)).orderBy(asc(quizQuestions.position))
  return rows.map((q) => ({
    id: q.id,
    position: q.position,
    points: q.points,
    type: q.type,
    question: q.question,
    explanation: q.explanation,
    options: q.optionsJson ? JSON.parse(q.optionsJson) as { id: string; label: string; text: string; isCorrect: boolean }[] : [],
  }))
}

/** Auto-grade MCQ for an attempt (returns raw points) */
function questionAppliesToClass(targetClassIds: string | null, classId: string | null) {
  if (!targetClassIds) return true
  try {
    const ids = JSON.parse(targetClassIds) as string[]
    return !ids.length || (!!classId && ids.includes(classId))
  } catch { return true }
}

export async function autoGradeAttempt(attemptId: string) {
  const attempt = await db.query.quizAttempts.findFirst({ where: eq(quizAttempts.id, attemptId) })
  if (!attempt) return 0
  const student = await db.query.students.findFirst({ where: eq(students.id, attempt.studentId), columns: { classId: true } })
  const questions = (await db.select().from(quizQuestions).where(eq(quizQuestions.activityId, attempt.activityId))).filter((q) => questionAppliesToClass(q.targetClassIds, student?.classId ?? null))
  const qMap = new Map(questions.map((q) => [q.id, q]))
  const answers = await db.select().from(quizAttemptAnswers).where(eq(quizAttemptAnswers.attemptId, attemptId))
  let raw = 0
  for (const ans of answers) {
    const q = qMap.get(ans.quizQuestionId)
    if (!q || q.type !== 'multiple_choice') continue
    const opts = q.optionsJson ? JSON.parse(q.optionsJson) as { id: string; isCorrect: boolean }[] : []
    const isCorrect = opts.some((o) => o.isCorrect && o.id === ans.selectedOptionId)
    const pointsEarned = isCorrect ? q.points : 0
    raw += pointsEarned
    await db.update(quizAttemptAnswers).set({ isCorrect, pointsEarned }).where(eq(quizAttemptAnswers.id, ans.id))
  }
  return raw
}

/**
 * Finalize an attempt: auto-grade MCQ, hitung skor ternormalisasi, set status.
 * auto = true (waktu habis / dipaksa sistem) → status auto_submitted.
 */
export async function finalizeAttempt(attemptId: string, opts: { auto?: boolean } = {}) {
  const attempt = await db.query.quizAttempts.findFirst({ where: eq(quizAttempts.id, attemptId) })
  if (!attempt) return { score: 0, status: 'in_progress' as const }
  await autoGradeAttempt(attemptId)
  const questions = await db.select().from(quizQuestions).where(eq(quizQuestions.activityId, attempt.activityId))
  const answers = await db.select().from(quizAttemptAnswers).where(eq(quizAttemptAnswers.attemptId, attemptId))
  const answerMap = new Map(answers.map((a) => [a.quizQuestionId, a]))
  // Essay tanpa nilai = belum dikoreksi
  const ungradedEssay = questions.some((q) => q.type === 'essay' && answerMap.get(q.id)?.pointsEarned == null)
  const status = ungradedEssay ? 'needs_grading' : (opts.auto ? 'auto_submitted' : 'submitted')
  const score = await computeNormalizedScore(attemptId)
  await db.update(quizAttempts).set({
    score,
    status,
    submittedAt: attempt.submittedAt ?? new Date(),
    autoSubmitted: opts.auto ? true : attempt.autoSubmitted,
  }).where(eq(quizAttempts.id, attemptId))
  // Rekam pada log hanya untuk attempt yang pertama kali difinalisasi
  if (!attempt.submittedAt) {
    await db.insert(quizEvents).values({
      id: crypto.randomUUID(),
      attemptId,
      activityId: attempt.activityId,
      studentId: attempt.studentId,
      type: opts.auto ? 'auto_submit' : 'submit',
    })
  }
  await recomputeProgress(attempt.activityId, attempt.studentId)
  return { score, status }
}

/** Compute normalized score: earned / totalWeight × maxPoint */
export async function computeNormalizedScore(attemptId: string) {
  const attempt = await db.query.quizAttempts.findFirst({ where: eq(quizAttempts.id, attemptId) })
  if (!attempt) return 0
  const [activity, questionRows, answers] = await Promise.all([
    db.query.activities.findFirst({ where: eq(activities.id, attempt.activityId) }),
    db.select().from(quizQuestions).where(eq(quizQuestions.activityId, attempt.activityId)),
    db.select().from(quizAttemptAnswers).where(eq(quizAttemptAnswers.attemptId, attemptId)),
  ])
  const student = await db.query.students.findFirst({ where: eq(students.id, attempt.studentId), columns: { classId: true } })
  const questions = questionRows.filter((q) => questionAppliesToClass(q.targetClassIds, student?.classId ?? null))
  const maxPoint = activity?.maxPoint ?? 100
  const totalWeight = questions.reduce((sum, q) => sum + q.points, 0)
  const earned = answers.reduce((sum, a) => sum + (a.pointsEarned ?? 0), 0)
  if (totalWeight <= 0) return 0
  return Math.round((earned / totalWeight) * maxPoint * 100) / 100
}

/** Score visibility for student: immediate, after quiz close, or hidden. */
export function canStudentSeeScore(activity: { scoreVisibility?: string | null; closeAt?: string | null }) {
  if (activity.scoreVisibility === 'never') return false
  if (activity.scoreVisibility === 'after_close') return !!activity.closeAt && Date.now() >= new Date(activity.closeAt).getTime()
  return true
}

/** Answer review visibility. Never reveal answer keys during an active attempt. */
export function canStudentSeeReview(activity: { reviewMode?: string | null; closeAt?: string | null }, status: string) {
  if (status === 'in_progress' || activity.reviewMode === 'never') return false
  if (activity.reviewMode === 'after_close') return !!activity.closeAt && Date.now() >= new Date(activity.closeAt).getTime()
  return true
}

/** Update activity_progress summary for a student+quiz */
export async function recomputeProgress(activityId: string, studentId: string) {
  const attempts = await db.select().from(quizAttempts).where(and(eq(quizAttempts.activityId, activityId), eq(quizAttempts.studentId, studentId))).orderBy(asc(quizAttempts.startedAt))
  const completed = attempts.filter((a) => ['submitted', 'auto_submitted', 'needs_grading'].includes(a.status))
  let bestScore: number | null = null
  let bestId: string | null = null
  for (const a of completed) {
    if (a.score != null && (bestScore === null || a.score > bestScore)) {
      bestScore = a.score
      bestId = a.id
    }
  }
  const last = completed[completed.length - 1]
  const lastScore = last?.score ?? null
  const lastId = last?.id ?? null

  const activity = await db.query.activities.findFirst({ where: eq(activities.id, activityId) })
  const existing = await db.query.activityProgress.findFirst({
    where: and(eq(activityProgress.activityId, activityId), eq(activityProgress.studentId, studentId)),
  })

  const submittedAt = last?.submittedAt ?? existing?.submittedAt ?? null

  // Fase 2: quiz dianggap terlambat bila attempt terakhir lewat batas waktu.
  const deadline = activity?.closeAt ?? activity?.dueDate ?? null
  const isLate = !!deadline && !!submittedAt && submittedAt.getTime() > new Date(deadline).getTime()

  // Fase 1: passingScore menentukan apakah quiz terhitung selesai.
  const decision = evaluateCompletion({
    activity: activity ?? { type: 'quiz' },
    progress: { viewedAt: existing?.viewedAt ?? new Date(), submittedAt, completedAt: null, score: bestScore },
    lastQuizAttempt: { score: bestScore, submittedAt },
  })
  const completedAt = decision.done ? (existing?.completedAt ?? submittedAt ?? new Date()) : null

  const values = {
    attemptCount: completed.length,
    bestScore,
    lastScore,
    bestAttemptId: bestId,
    lastAttemptId: lastId,
    score: bestScore,
    submittedAt,
    gradedAt: completed.some((a) => a.status === 'needs_grading') ? null : existing?.gradedAt ?? null,
    isLate,
    completedAt,
  }

  if (existing) {
    await db.update(activityProgress).set(values).where(eq(activityProgress.id, existing.id))
  } else {
    await db.insert(activityProgress).values({
      id: crypto.randomUUID(),
      activityId,
      studentId,
      ...values,
      viewedAt: new Date(),
    })
  }
}

type ParsedQuestion = { type: string; question: string; options: { label: string; text: string; isCorrect: boolean }[]; correctLabel: string }

/** Parse Aiken text to questions array (satu blok = pertanyaan + opsi + ANSWER: X). */
export function parseAiken(text: string): ParsedQuestion[] {
  const lines = text.replace(/\r/g, '').split('\n').map((l) => l.trim())
  const questions: ParsedQuestion[] = []
  let buffer: string[] = []

  const flush = () => {
    if (!buffer.length) return
    const correctLine = buffer.find((l) => /^ANSWER\s*:\s*[A-Z]/i.test(l))
    if (correctLine) {
      const correctLabel = correctLine.replace(/^ANSWER\s*:\s*/i, '').trim().toUpperCase()
      const optionLines = buffer.filter((l) => /^[A-Z][.)]\s+/.test(l))
      const question = buffer.filter((l) => !/^[A-Z][.)]\s+/.test(l) && !/^ANSWER\s*:/i.test(l)).join(' ').trim()
      const options = optionLines.map((l) => {
        const label = l.charAt(0).toUpperCase()
        return { label, text: l.replace(/^[A-Za-z][.)]\s*/, '').trim(), isCorrect: label === correctLabel }
      })
      if (question && options.length >= 2) questions.push({ type: 'multiple_choice', question, options, correctLabel })
    }
    buffer = []
  }

  for (const line of lines) {
    if (!line) { flush(); continue }
    buffer.push(line)
    if (/^ANSWER\s*:/i.test(line)) flush()
  }
  flush()
  return questions
}

/** Parse one CSV row, including quoted commas and escaped quotes. */
function parseCsvRow(line: string) {
  const cells: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"' && line[i + 1] === '"' && quoted) { cell += '"'; i++; continue }
    if (char === '"') { quoted = !quoted; continue }
    if (char === ',' && !quoted) { cells.push(cell.trim()); cell = ''; continue }
    cell += char
  }
  cells.push(cell.trim())
  return cells
}

/** Parse CSV text to questions array */
export function parseCsvQuestions(text: string): { type: string; question: string; options: { label: string; text: string; isCorrect: boolean }[]; points?: number }[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) return []
  const header = parseCsvRow(lines[0] ?? '').map((h) => h.toLowerCase())
  const qi = header.indexOf('question')
  if (qi < 0) return []
  const ti = header.indexOf('type')
  const pi = header.indexOf('points')
  const ei = header.indexOf('explanation')
  const optIndices: { idx: number; label: string; correct: boolean }[] = []
  for (let i = 0; i < header.length; i++) {
    const m = header[i]?.match(/^option_([a-z])$/)
    if (m?.[1]) optIndices.push({ idx: i, label: m[1].toUpperCase(), correct: false })
  }
  const ci = header.findIndex((h) => /^correct|answer$/i.test(h))

  const questions: { type: string; question: string; options: { label: string; text: string; isCorrect: boolean }[]; points?: number }[] = []
  for (let li = 1; li < lines.length; li++) {
    const cols = parseCsvRow(lines[li] ?? '')
    const question = cols[qi]
    if (!question) continue
    const type = ((ti >= 0 ? cols[ti] : 'multiple_choice') || 'multiple_choice').toLowerCase()
    const points = pi >= 0 ? Number(cols[pi]) || undefined : undefined
    let options: { label: string; text: string; isCorrect: boolean }[] = []
    if (type !== 'essay' && optIndices.length >= 2) {
      const correctLabel = ci >= 0 ? (cols[ci] ?? '').toUpperCase() : ''
      options = optIndices
        .map((o) => ({ label: o.label, text: cols[o.idx] ?? '', isCorrect: o.label === correctLabel }))
        .filter((o) => o.text !== '')
    }
    questions.push({ type: type === 'essay' ? 'essay' : 'multiple_choice', question, options, points })
  }
  return questions
}
