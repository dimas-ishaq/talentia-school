// ============================================================
// Template/preset bobot nilai per tipe aktivitas.
// Dipakai bersama oleh server & klien. Total tiap preset = 100.
// ============================================================

export interface GradeWeightPreset {
  id: string
  name: string
  description: string
  icon: string
  weights: Record<string, number>
}

export const GRADE_WEIGHT_PRESETS: GradeWeightPreset[] = [
  {
    id: 'seimbang',
    name: 'Seimbang',
    description: 'Semua tipe aktivitas dinilai secara proporsional.',
    icon: 'heroicons:scale',
    weights: { text: 10, file: 5, video: 5, quiz: 25, assignment: 30, forum: 15, presentation: 10 },
  },
  {
    id: 'fokus-kuis',
    name: 'Fokus Kuis',
    description: 'Cocok untuk kursus yang menekankan ujian/kuis.',
    icon: 'heroicons:academic-cap',
    weights: { text: 5, file: 5, video: 0, quiz: 50, assignment: 25, forum: 10, presentation: 5 },
  },
  {
    id: 'berbasis-tugas',
    name: 'Berbasis Tugas',
    description: 'Penekanan pada tugas tertulis/terstruktur.',
    icon: 'heroicons:pencil-square',
    weights: { text: 5, file: 0, video: 0, quiz: 25, assignment: 50, forum: 10, presentation: 10 },
  },
  {
    id: 'praktik-presentasi',
    name: 'Praktik & Presentasi',
    description: 'Untuk kursus dengan banyak praktik dan presentasi.',
    icon: 'heroicons:presentation-chart-bar',
    weights: { text: 5, file: 0, video: 0, quiz: 20, assignment: 30, forum: 10, presentation: 35 },
  },
  {
    id: 'partisipasi',
    name: 'Partisipasi Aktif',
    description: 'Menonjolkan diskusi dan keaktifan siswa.',
    icon: 'heroicons:chat-bubble-left-right',
    weights: { text: 5, file: 0, video: 0, quiz: 20, assignment: 25, forum: 40, presentation: 10 },
  },
  {
    id: 'formatif',
    name: 'Asesmen Formatif',
    description: 'Menekankan proses belajar: baca, tonton, dan tugas.',
    icon: 'heroicons:book-open',
    weights: { text: 20, file: 10, video: 10, quiz: 20, assignment: 30, forum: 10, presentation: 0 },
  },
]
