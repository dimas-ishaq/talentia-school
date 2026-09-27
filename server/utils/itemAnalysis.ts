// server/utils/itemAnalysis.ts — analisis butir soal ala guru Indonesia
// - Tingkat kesukaran (P) : proporsi benar / skor rata-rata
// - Daya pembeda (D)     : kelompok atas vs bawah (27% / median)
// - Validitas butir      : point-biserial (PG) / korelasi Pearson (essay)
// - Pengecoh             : distribusi pilihan tiap opsi
// - Reliabilitas         : KR-20 (semua PG) / Cronbach alpha
// Analisis dihitung on-the-fly dari jawaban tersimpan → selalu versi terbaru.
import { asc, eq, inArray } from 'drizzle-orm'
import { quizQuestions, quizAttempts, quizAttemptAnswers, students, users, classes } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { autoGradeAttempt, computeNormalizedScore, recomputeProgress } from '~~/server/utils/quiz'

const COMPLETED = ['submitted', 'auto_submitted', 'needs_grading'] as const

const r2 = (x: number) => (Number.isFinite(x) ? Math.round(x * 100) / 100 : 0)
const pct = (n: number, d: number) => (d > 0 ? n / d : 0)

function mean(values: number[]) {
  return values.length ? values.reduce((s, x) => s + x, 0) / values.length : 0
}

function populationSd(values: number[]) {
  const n = values.length
  if (n < 1) return 0
  const m = mean(values)
  return Math.sqrt(values.reduce((s, x) => s + (x - m) ** 2, 0) / n)
}

function variance(values: number[]) {
  if (values.length < 2) return 0
  return populationSd(values) ** 2
}

/** Point-biserial: korelasi skor item (0/1) dengan skor total */
function pointBiserial(pairs: { score: number; total: number }[]) {
  const n = pairs.length
  const p = pct(pairs.filter((x) => x.score === 1).length, n)
  if (n < 2 || p === 0 || p === 1) return 0
  const m1 = pairs.filter((x) => x.score === 1).reduce((s, x) => s + x.total, 0) / (p * n)
  const m0 = pairs.filter((x) => x.score === 0).reduce((s, x) => s + x.total, 0) / ((1 - p) * n)
  const sx = populationSd(pairs.map((x) => x.total))
  if (!sx) return 0
  return ((m1 - m0) / sx) * Math.sqrt(p * (1 - p))
}

/** Pearson: korelasi skor essay (kontinu) dengan skor total */
function pearson(pairs: { score: number; total: number }[]) {
  const n = pairs.length
  if (n < 2) return 0
  const ms = mean(pairs.map((x) => x.score))
  const mt = mean(pairs.map((x) => x.total))
  const cov = pairs.reduce((s, x) => s + (x.score - ms) * (x.total - mt), 0) / n
  const ss = populationSd(pairs.map((x) => x.score))
  const st = populationSd(pairs.map((x) => x.total))
  if (!ss || !st) return 0
  return cov / (ss * st)
}

/** Bagi kelompok atas/bawah: 27% bila n>=30, median bila n kecil */
function splitGroups<T extends { total: number }>(rows: T[]) {
  const sorted = [...rows].sort((a, b) => b.total - a.total)
  const n = sorted.length
  const size = n >= 30 ? Math.max(1, Math.ceil(n * 0.27)) : Math.max(1, Math.ceil(n / 2))
  const upper = sorted.slice(0, size)
  const lower = sorted.slice(Math.max(size, n - size))
  return { upper, lower, method: n >= 30 ? 'atas-bawah 27%' : 'median 50%' }
}

function difficultyLabel(p: number) {
  if (p < 0.3) return 'Sukar'
  if (p <= 0.7) return 'Sedang'
  return 'Mudah'
}

function discriminationLabel(d: number) {
  if (d < 0) return 'Sangat buruk'
  if (d < 0.2) return 'Jelek'
  if (d < 0.4) return 'Cukup'
  if (d < 0.7) return 'Baik'
  return 'Sangat baik'
}

function validityLabel(v: number) {
  if (v < 0.2) return 'Rendah'
  if (v < 0.3) return 'Cukup'
  return 'Tinggi'
}

function recommend(p: number, d: number, opts: { effective?: number; total?: number } = {}) {
  if (d < 0) return { status: 'kunci' as const, label: 'Periksa kunci/pedoman penskoran' }
  const dl = discriminationLabel(d)
  if (dl === 'Jelek' || dl === 'Sangat buruk') return { status: 'revisi' as const, label: 'Perlu direvisi' }
  if (p < 0.3 || p > 0.9) return { status: 'tinjau' as const, label: 'Pertimbangkan revisi' }
  if (opts.total && opts.total > 0 && (opts.effective ?? 0) < opts.total) return { status: 'revisi' as const, label: 'Perbaiki pengecoh' }
  return { status: 'dipertahankan' as const, label: 'Dipertahankan' }
}

function cronbachAlpha(itemVariances: number[], totalVariance: number) {
  const valid = itemVariances.filter((v) => Number.isFinite(v) && v >= 0)
  const k = valid.length
  if (k < 2 || !totalVariance) return 0
  const sumItem = valid.reduce((s, v) => s + v, 0)
  if (sumItem >= totalVariance) return 0
  return (k / (k - 1)) * (1 - sumItem / totalVariance)
}

interface ItemOptionStat {
  id: string
  label: string
  text: string
  isCorrect: boolean
  count: number
  pct: number
  upperCount: number
  lowerCount: number
  effective: boolean
}

type AnswerRow = {
  attemptId: string
  studentId: string | null
  quizQuestionId: string
  selectedOptionId: string | null
  answerText: string | null
  isCorrect: boolean | null
  pointsEarned: number | null
  total: number
}

export async function computeItemAnalysis(activityId: string, opts: { classId?: string | null } = {}) {
  const classFilter = opts.classId || null
  const questions = await db.select().from(quizQuestions).where(eq(quizQuestions.activityId, activityId)).orderBy(asc(quizQuestions.position))
  const attempts = await db.select().from(quizAttempts).where(eq(quizAttempts.activityId, activityId))
  const done = attempts.filter((a) => COMPLETED.includes(a.status as any))

  const empty = {
    quiz: { title: '', maxPoint: 100 },
    participants: 0,
    smallSample: true,
    summary: null,
    classes: [],
    histogram: [] as { from: number; to: number; count: number }[],
    difficultyDist: { sukar: 0, sedang: 0, mudah: 0 },
    items: [] as any[],
    participantList: [] as any[],
  }
  if (!done.length) return empty

  const answers = await db.select().from(quizAttemptAnswers).where(inArray(quizAttemptAnswers.attemptId, done.map((a) => a.id)))
  const studentIds = [...new Set(done.map((a) => a.studentId))]
  const studentRows = await db.select({ id: students.id, userId: students.userId, classId: students.classId }).from(students).where(inArray(students.id, studentIds))
  const userRows = await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, studentRows.map((s) => s.userId)))
  const userNames = new Map(userRows.map((u) => [u.id, u.name]))
  const studentMeta = new Map(studentRows.map((s) => [s.id, { userId: s.userId, classId: s.classId }]))
  const classIds = [...new Set(studentRows.map((s) => s.classId).filter((x): x is string => !!x))]
  const classRows = classIds.length ? await db.select().from(classes).where(inArray(classes.id, classIds)) : []
  const classNames = new Map(classRows.map((c) => [c.id, c.name]))

  // Skor mental per attempt = jumlah pointsEarned (untuk pemeringkatan)
  const earnedByAttempt = new Map<string, number>()
  for (const a of answers) earnedByAttempt.set(a.attemptId, (earnedByAttempt.get(a.attemptId) ?? 0) + (a.pointsEarned ?? 0))

  // Ambil attempt TERBAIK per siswa (konsisten dengan progress bestScore)
  const bestByStudent = new Map<string, typeof done[number]>()
  for (const a of done) {
    const cur = bestByStudent.get(a.studentId)
    if (!cur || (earnedByAttempt.get(a.id) ?? 0) > (earnedByAttempt.get(cur.id) ?? 0)) bestByStudent.set(a.studentId, a)
  }
  let participants = [...bestByStudent.values()]
  if (classFilter) participants = participants.filter((a) => studentMeta.get(a.studentId)?.classId === classFilter)

  if (!participants.length) return { ...empty, classes: classList(participants, studentMeta, classNames) }

  const totalByStudent = new Map<string, number>()
  for (const a of participants) totalByStudent.set(a.studentId, earnedByAttempt.get(a.id) ?? 0)

  const chosenAttemptIds = new Set(participants.map((a) => a.id))
  const attemptStudent = new Map(participants.map((a) => [a.id, a.studentId]))
  const chosen: AnswerRow[] = answers
    .filter((x) => chosenAttemptIds.has(x.attemptId))
    .map((x) => ({
      attemptId: x.attemptId,
      studentId: attemptStudent.get(x.attemptId) ?? null,
      quizQuestionId: x.quizQuestionId,
      selectedOptionId: x.selectedOptionId,
      answerText: x.answerText,
      isCorrect: x.isCorrect,
      pointsEarned: x.pointsEarned,
      total: totalByStudent.get(attemptStudent.get(x.attemptId) ?? '') ?? 0,
    }))

  const items = questions.map((q) => analyzeQuestion(q, chosen.filter((x) => x.quizQuestionId === q.id)))

  // ---- Ringkasan ----
  const totals = participants.map((a) => totalByStudent.get(a.studentId) ?? 0)
  const allMcq = questions.every((q) => q.type === 'multiple_choice')
  const itemVariances = questions.map((q) => {
    const vals = chosen.filter((x) => x.quizQuestionId === q.id).map((x) => {
      if (q.type === 'multiple_choice') return x.isCorrect ? 1 : 0
      return x.pointsEarned != null ? x.pointsEarned / (q.points || 1) : null
    }).filter((v): v is number => v != null)
    return vals.length ? variance(vals) : 0
  })
  const reliability = r2(cronbachAlpha(itemVariances, variance(totals)))
  const smallSample = participants.length < 30

  const summary = {
    participants: participants.length,
    mean: r2(mean(totals)),
    min: r2(Math.min(...totals)),
    max: r2(Math.max(...totals)),
    sd: r2(populationSd(totals)),
    reliability,
    reliabilityMethod: allMcq ? 'KR-20' : 'Cronbach alpha',
    smallSample,
  }

  const difficultyDist = { sukar: 0, sedang: 0, mudah: 0 }
  for (const it of items) {
    if (it.difficulty == null) continue
    if (it.difficultyLabel === 'Sukar') difficultyDist.sukar++
    else if (it.difficultyLabel === 'Sedang') difficultyDist.sedang++
    else difficultyDist.mudah++
  }

  const participantList = participants.map((a) => {
    const st = studentMeta.get(a.studentId)
    return {
      studentId: a.studentId,
      name: st?.userId ? (userNames.get(st.userId) ?? 'Siswa') : 'Siswa',
      className: st?.classId ? (classNames.get(st.classId) ?? '') : '',
      attemptNumber: a.attemptNumber,
      score: r2(a.score ?? 0),
    }
  }).sort((a, b) => a.name.localeCompare(b.name))

  return {
    quiz: { title: '', maxPoint: 100 },
    participants: participants.length,
    smallSample,
    summary,
    classes: classList(participants, studentMeta, classNames),
    histogram: histogram(totals),
    difficultyDist,
    items,
    participantList,
  }
}

function classList(participants: { studentId: string }[], studentMeta: Map<string, { classId: string | null }>, classNames: Map<string, string>) {
  const count = new Map<string, number>()
  for (const a of participants) {
    const cid = studentMeta.get(a.studentId)?.classId
    if (cid) count.set(cid, (count.get(cid) ?? 0) + 1)
  }
  return [...count.entries()]
    .map(([id, n]) => ({ id, name: classNames.get(id) ?? 'Kelas', count: n }))
    .sort((x, y) => x.name.localeCompare(y.name))
}

function analyzeQuestion(q: { id: string; position: number; type: string; question: string; explanation: string | null; points: number; optionsJson: string | null }, pairs: AnswerRow[]) {
  if (q.type === 'multiple_choice') return analyzeMcq(q, pairs)
  return analyzeEssay(q, pairs)
}

function analyzeMcq(q: any, pairs: AnswerRow[]) {
  const answered = pairs.filter((x) => x.selectedOptionId)
  const n = answered.length
  const correctCount = answered.filter((x) => x.isCorrect === true).length
  const P = pct(correctCount, n)
  const { upper, lower, method } = splitGroups(answered)
  const pu = pct(upper.filter((x) => x.isCorrect === true).length, upper.length)
  const pl = pct(lower.filter((x) => x.isCorrect === true).length, lower.length)
  const D = pu - pl
  const validity = pointBiserial(answered.map((x) => ({ score: x.isCorrect ? 1 : 0, total: x.total })))

  const parsed = q.optionsJson ? (JSON.parse(q.optionsJson) as { id: string; label: string; text: string; isCorrect: boolean }[]) : []
  const options: ItemOptionStat[] = parsed.map((o) => {
    const count = answered.filter((x) => x.selectedOptionId === o.id).length
    const upperCount = upper.filter((x) => x.selectedOptionId === o.id).length
    const lowerCount = lower.filter((x) => x.selectedOptionId === o.id).length
    return {
      id: o.id,
      label: o.label,
      text: o.text,
      isCorrect: o.isCorrect,
      count,
      pct: r2(pct(count, n) * 100),
      upperCount,
      lowerCount,
      effective: !o.isCorrect && count > 0 && (pct(count, n) >= 0.05 || lowerCount > upperCount),
    }
  })
  const distractors = options.filter((o) => !o.isCorrect)
  const effective = distractors.filter((o) => o.effective).length
  const keyLabel = parsed.find((o) => o.isCorrect)?.label ?? null

  return {
    id: q.id,
    position: q.position,
    type: 'multiple_choice',
    question: q.question,
    explanation: q.explanation,
    points: q.points,
    participants: n,
    ungraded: 0,
    keyLabel,
    difficulty: n ? r2(P) : null,
    difficultyLabel: n ? difficultyLabel(P) : '—',
    discrimination: n >= 2 ? r2(D) : null,
    discriminationLabel: n >= 2 ? discriminationLabel(D) : '—',
    discriminationMethod: method,
    validity: n >= 2 ? r2(validity) : null,
    validityLabel: n >= 2 ? validityLabel(validity) : '—',
    distractorEffectiveCount: effective,
    distractorTotal: distractors.length,
    options,
    essayDist: null,
    recommendation: n >= 2 ? recommend(P, D, { effective, total: distractors.length }) : { status: 'tinjau' as const, label: 'Belum cukup data' },
  }
}

function analyzeEssay(q: any, pairs: AnswerRow[]) {
  const hasAnswer = pairs.filter((x) => x.answerText != null && x.answerText !== '')
  const graded = pairs.filter((x) => x.pointsEarned != null)
  const max = q.points || 1
  const P = graded.length ? mean(graded.map((x) => x.pointsEarned as number)) / max : 0

  let D: number | null = null
  let validity: number | null = null
  let method = 'median 50%'
  if (graded.length >= 2) {
    const split = splitGroups(graded)
    method = split.method
    const mu = mean(split.upper.map((x) => x.pointsEarned as number))
    const ml = mean(split.lower.map((x) => x.pointsEarned as number))
    D = (mu - ml) / max
    validity = pearson(graded.map((x) => ({ score: (x.pointsEarned as number) / max, total: x.total })))
  }

  const full = graded.filter((x) => (x.pointsEarned as number) >= max).length
  const zero = graded.filter((x) => (x.pointsEarned as number) <= 0).length
  const essayDist = { full, partial: Math.max(0, graded.length - full - zero), zero }

  return {
    id: q.id,
    position: q.position,
    type: 'essay',
    question: q.question,
    explanation: q.explanation,
    points: q.points,
    participants: hasAnswer.length,
    ungraded: Math.max(0, hasAnswer.length - graded.length),
    keyLabel: null,
    difficulty: graded.length ? r2(P) : null,
    difficultyLabel: graded.length ? difficultyLabel(P) : 'Belum dinilai',
    discrimination: D != null ? r2(D) : null,
    discriminationLabel: D != null ? discriminationLabel(D) : '—',
    discriminationMethod: method,
    validity: validity != null ? r2(validity) : null,
    validityLabel: validity != null ? validityLabel(validity) : '—',
    distractorEffectiveCount: 0,
    distractorTotal: 0,
    options: [] as ItemOptionStat[],
    essayDist,
    recommendation: D != null ? recommend(P, D) : { status: 'tinjau' as const, label: 'Belum cukup data' },
  }
}

function histogram(values: number[]) {
  if (!values.length) return []
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  if (lo === hi) return [{ from: r2(lo), to: r2(hi), count: values.length }]
  const bins = 10
  const w = (hi - lo) / bins
  const res: { from: number; to: number; count: number }[] = []
  for (let i = 0; i < bins; i++) {
    const from = lo + i * w
    const to = i === bins - 1 ? hi : lo + (i + 1) * w
    const count = values.filter((v) => (i === bins - 1 ? v >= from && v <= to : v >= from && v < to)).length
    res.push({ from: r2(from), to: r2(to), count })
  }
  return res
}

/** Regrade seluruh attempt quiz: auto-score ulang PG + hitung ulang skor & progress.
 *  Dipakai setelah kunci jawaban diubah (penilaian ulang). */
export async function regradeQuiz(activityId: string) {
  const attempts = await db.select().from(quizAttempts).where(eq(quizAttempts.activityId, activityId))
  const done = attempts.filter((a) => COMPLETED.includes(a.status as any))
  const questions = await db.select().from(quizQuestions).where(eq(quizQuestions.activityId, activityId))
  let count = 0
  for (const attempt of done) {
    await autoGradeAttempt(attempt.id)
    const answers = await db.select().from(quizAttemptAnswers).where(eq(quizAttemptAnswers.attemptId, attempt.id))
    const answerMap = new Map(answers.map((a) => [a.quizQuestionId, a]))
    const ungradedEssay = questions.some((q) => q.type === 'essay' && answerMap.get(q.id)?.pointsEarned == null)
    const score = await computeNormalizedScore(attempt.id)
    const status = ungradedEssay ? ('needs_grading' as const) : (attempt.autoSubmitted ? ('auto_submitted' as const) : ('submitted' as const))
    await db.update(quizAttempts).set({ score, status }).where(eq(quizAttempts.id, attempt.id))
    await recomputeProgress(activityId, attempt.studentId)
    count++
  }
  return count
}