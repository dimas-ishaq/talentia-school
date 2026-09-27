import { requireQuizActivity } from '~~/server/utils/quiz'
import { requireCourseManager } from '~~/server/utils/courseAccess'
import { computeItemAnalysis } from '~~/server/utils/itemAnalysis'

function csvCell(value: unknown) {
  const text = String(value ?? '').replace(/"/g, '""')
  return `"${text}"`
}

export default defineEventHandler(async (event) => {
  const courseId = getRouterParam(event, 'id')!
  const quizId = getRouterParam(event, 'quizId')!
  await requireCourseManager(event, courseId)
  const activity = await requireQuizActivity(event, courseId, quizId)
  const query = getQuery(event)
  const classId = typeof query.classId === 'string' && query.classId ? query.classId : null
  const analysis = await computeItemAnalysis(quizId, { classId })

  const rows: unknown[][] = [
    ['Laporan Analisis Butir Soal', activity.title],
    ['Peserta', analysis.participants],
    ['Rata-rata skor', analysis.summary?.mean ?? '-'],
    ['Reliabilitas', analysis.summary?.reliability ?? '-'],
    [],
    ['No', 'Jenis', 'Pertanyaan', 'Peserta', 'Belum dinilai', 'Tingkat kesukaran', 'Kategori kesukaran', 'Daya pembeda', 'Kategori daya pembeda', 'Validitas', 'Rekomendasi', 'Kunci', 'Pengecoh efektif'],
    ...analysis.items.map((item: any) => [
      item.position,
      item.type === 'essay' ? 'Essay' : 'Pilihan ganda',
      item.question,
      item.participants,
      item.ungraded,
      item.difficulty ?? '-',
      item.difficultyLabel,
      item.discrimination ?? '-',
      item.discriminationLabel,
      item.validity ?? '-',
      item.recommendation.label,
      item.keyLabel ?? '-',
      item.type === 'essay' ? '-' : `${item.distractorEffectiveCount}/${item.distractorTotal}`,
    ]),
    [],
    ['Hasil peserta'],
    ['Nama', 'Kelas', 'Percobaan', 'Nilai'],
    ...analysis.participantList.map((row: any) => [row.name, row.className, row.attemptNumber, row.score]),
  ]

  const csv = '\uFEFF' + rows.map((row) => row.map(csvCell).join(';')).join('\r\n')
  setHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
  setHeader(event, 'Content-Disposition', `attachment; filename="analisis-${quizId}.csv"`)
  return csv
})
