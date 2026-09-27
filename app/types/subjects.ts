// app/types/subjects.ts
// Tipe data untuk fitur Mata Pelajaran (mirror types/classes.ts)

export interface SubjectRow {
  id: string
  code: string
  name: string
  description: string | null
  isActive: boolean
}

export interface SubjectFormPayload {
  code: string
  name: string
  description?: string
}
