// app/types/classes.ts
// Tipos compartidos para el feature Kelas

export interface ClassRow {
  id: string
  name: string
  level: number
  teacherId: string | null
  teacherName?: string | null
  studentCount?: number
  isActive: boolean
}

export interface TeacherOption {
  id: string
  name: string
  nip: string | null
}

export interface ClassFormPayload {
  name: string
  level: number
  teacherId: string | null
}