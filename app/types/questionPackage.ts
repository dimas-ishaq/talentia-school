export interface QuestionPackage {
  id: string
  courseId: string
  courseName?: string
  name: string
  description: string | null
  createdBy: string
  isActive: boolean
  createdAt: string | Date
  questionCount?: number
}