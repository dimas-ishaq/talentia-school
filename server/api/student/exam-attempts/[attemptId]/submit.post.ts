// POST /api/student/exam-attempts/[attemptId]/submit — kumpulkan ujian + hitung nilai + simpan ke grades
import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { quizAttempts, quizQuestions, quizAttemptAnswers, students, examEventSubjects, examSessions, exams, grades, subjects } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { finalizeAttempt } from '~~/server/utils/quiz'

const schema = z.object({
  answers: z.array(z.object({
    questionId: z.string(),
    selectedOptionId: z.string().nullable().optional(),
    answerText: z.string().max(5000).nullable().optional(),
  })),
})

export default defineEventHandler(async (event) => {
  const attemptId = String(getRouterParam(event, 'attemptId') ?? '')
  const { user } = await requireUserSession(event)
  if (user.role !== 'student') throw createError({ statusCode: 403, statusMessage: 'Hanya siswa' })

  const student = await db.query.students.findFirst({ where: eq(students.userId, user.id) })
  if (!student) throw createError({ statusCode: 403, statusMessage: 'Data siswa tidak ditemukan' })

  const attempt = await db.query.quizAttempts.findFirst({
    where: and(eq(quizAttempts.id, attemptId), eq(quizAttempts.studentId, student.id)),
  })
  if (!attempt || attempt.status !== 'in_progress') throw createError({ statusCode: 400, statusMessage: 'Percobaan tidak valid atau sudah selesai' })
  if (attempt.lockStatus === 'locked') throw createError({ statusCode: 403, statusMessage: 'Ujian terkunci, hubungi pengawas' })

  const body = schema.parse(await readBody(event))

  // Auto jika waktu habis
  let auto = false
  const session = attempt.sessionId ? await db.query.examSessions.findFirst({ where: eq(examSessions.id, attempt.sessionId) }) : null
  const durationMinutes = session?.durationMinutes ?? 90
  if (Date.now() - attempt.startedAt.getTime() > durationMinutes * 60000) auto = true

  // Simpan jawaban
  const questions = await db.select().from(quizQuestions).where(eq(quizQuestions.activityId, attempt.activityId))
  const qMap = new Map(questions.map((q) => [q.id, q]))
  for (const ans of body.answers) {
    if (!qMap.has(ans.questionId)) continue
    const existing = await db.query.quizAttemptAnswers.findFirst({
      where: and(eq(quizAttemptAnswers.attemptId, attempt.id), eq(quizAttemptAnswers.quizQuestionId, ans.questionId)),
    })
    const data = { selectedOptionId: ans.selectedOptionId ?? null, answerText: ans.answerText ?? null }
    if (existing) await db.update(quizAttemptAnswers).set(data).where(eq(quizAttemptAnswers.id, existing.id))
    else await db.insert(quizAttemptAnswers).values({ id: crypto.randomUUID(), attemptId: attempt.id, quizQuestionId: ans.questionId, ...data })
  }

  // Finalisasi + skor 0-100
  const result = await finalizeAttempt(attempt.id, { auto })

  // Tulis nilai ke tabel grades (jika mapel ujian)
  const subj = await db.query.examEventSubjects.findFirst({ where: eq(examEventSubjects.activityId, attempt.activityId) })
  if (subj) {
    // Pastikan ada record exams untuk (activityId × classId) — gunakan examId = activityId untuk key grades
    const classId = session?.classId ?? student.classId
    if (classId) {
      // Temukan exams legacy row yang cocok → buat jika belum (subjectId, classId, activityId jadi judul)
      const examRow = await db.query.exams.findFirst({
        where: and(eq(exams.subjectId, subj.subjectId), eq(exams.classId, classId), eq(exams.title, `Ujian ${await getSubjectName(subj.subjectId)}`)),
      })
      const examId = examRow?.id ?? crypto.randomUUID()
      if (!examRow) {
        await db.insert(exams).values({
          id: examId,
          title: `Ujian ${await getSubjectName(subj.subjectId)}`,
          subjectId: subj.subjectId,
          classId,
          examDate: startOfToday(),
          createdBy: user.id,
        })
      }
      // Upsert grade (unique examId+studentId)
      const existingGrade = await db.query.grades.findFirst({
        where: and(eq(grades.examId, examId), eq(grades.studentId, student.id)),
      })
      const gradeData = {
        examId,
        studentId: student.id,
        score: result.score,
        recordedBy: user.id,
      }
      if (existingGrade) await db.update(grades).set({ score: result.score }).where(eq(grades.id, existingGrade.id))
      else await db.insert(grades).values({ id: crypto.randomUUID(), ...gradeData })
    }
  }

  return { success: true, score: result.score, status: result.status, auto }
})

async function getSubjectName(subjectId: string) {
  const row = await db.query.subjects.findFirst({ where: eq(subjects.id, subjectId), columns: { name: true } })
  return row?.name ?? '?'
}
function startOfToday(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}