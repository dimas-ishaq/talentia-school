// ============================================================
// Tipe data Siswa — dipakai bareng oleh list, form, dan API.
// Pemula: kalau struktur tabel berubah, cukup ubah file ini.
// ============================================================

export interface Student {
  id: string
  nis: string | null
  name: string
  gender: 'L' | 'P' | null
  classId: string | null
  className: string | null
  isActive: boolean
}

export interface StudentDetail extends Student {
  email: string
  birthDate: string | null
  phone: string | null
  address: string | null
  parentId: string | null
}

export interface StudentListMeta {
  page: number
  perPage: number
  total: number
  totalPages: number
}

export interface StudentListResponse {
  data: Student[]
  meta: StudentListMeta
}
