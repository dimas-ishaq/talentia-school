// app/types/quiz.ts
export type QuestionType = 'multiple_choice' | 'essay'
export type AttemptStatus = 'in_progress' | 'submitted' | 'auto_submitted' | 'abandoned' | 'needs_grading'
export type QuizStatus = 'draft' | 'published'

export interface QuestionOption {
  id?: string
  label: string
  text: string
  isCorrect: boolean
}

export interface PackageQuestion {
  id: string
  packageId: string | null
  createdBy: string
  type: QuestionType
  question: string
  explanation: string | null
  defaultPoints: number
  isActive: boolean
  createdAt: string | Date
  options: QuestionOption[]
}

export interface QuizQuestion {
  id: string
  activityId: string
  bankQuestionId: string | null
  position: number
  points: number
  type: QuestionType
  question: string
  explanation: string | null
  optionsJson: string | null
  options: QuestionOption[]
}

export interface QuizAttempt {
  id: string
  activityId: string
  studentId: string
  attemptNumber: number
  startedAt: string | Date
  submittedAt: string | Date | null
  autoSubmitted: boolean
  status: AttemptStatus
  score: number | null
}

export interface QuizSettings {
  maxPoint: number
  durationMinutes: number | null
  openAt: string | null
  closeAt: string | null
  maxAttempts: number | null
  examMode: boolean
  status: QuizStatus
}
