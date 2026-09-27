// app/types/teachers.ts
// Tipe data untuk fitur Guru

export interface TeacherRow {
  id: string
  name: string
  code?: string | null           // Kode guru (G001, TCH2024, dll)
  nip: string | null
  phone: string | null
  address: string | null
  subject: string | null
  email?: string
  classCount?: number
  isActive: boolean
}

export interface TeacherFormPayload {
  name: string
  email: string
  password?: string
  code?: string                  // Kode guru
  nip: string
  phone?: string
  address?: string
  subject?: string
}