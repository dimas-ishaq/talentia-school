// app/types/itemAnalysis.ts
export interface ItemOptionStat {
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

export interface ItemRecommendation {
  status: 'dipertahankan' | 'revisi' | 'tinjau' | 'kunci'
  label: string
}

export interface ItemAnalysisRow {
  id: string
  position: number
  type: 'multiple_choice' | 'essay'
  question: string
  explanation: string | null
  points: number
  participants: number
  ungraded: number
  keyLabel: string | null
  difficulty: number | null
  difficultyLabel: string
  discrimination: number | null
  discriminationLabel: string
  discriminationMethod: string
  validity: number | null
  validityLabel: string
  distractorEffectiveCount: number
  distractorTotal: number
  options: ItemOptionStat[]
  essayDist: { full: number; partial: number; zero: number } | null
  recommendation: ItemRecommendation
}

export interface ItemAnalysisSummary {
  participants: number
  mean: number
  min: number
  max: number
  sd: number
  reliability: number
  reliabilityMethod: string
  smallSample: boolean
}

export interface ItemAnalysisResult {
  quiz: { title: string; maxPoint: number }
  participants: number
  smallSample: boolean
  summary: ItemAnalysisSummary | null
  classes: { id: string; name: string; count: number }[]
  histogram: { from: number; to: number; count: number }[]
  difficultyDist: { sukar: number; sedang: number; mudah: number }
  items: ItemAnalysisRow[]
  participantList: { studentId: string; name: string; className: string; attemptNumber: number; score: number }[]
}
