// utils/studentImport.ts
import { parseCSV, buildCsv, downloadCsv } from './csv'

// ===== Tipe =====
export type StudentImportRow = {
  nis: string
  name: string
  className: string
  gender: 'L' | 'P'
  email: string
  password: string
}

export type StudentImportParseResult = {
  rows: StudentImportRow[]
  errors: string[]
}

// ===== Konstanta =====
export const STUDENT_IMPORT_MAX_ROWS = 500
export const STUDENT_IMPORT_MAX_BYTES = 5 * 1024 * 1024 // 5 MB
export const STUDENT_IMPORT_HEADERS = ['NIS', 'Nama', 'Kelas', 'Gender', 'Email', 'Password'] as const

const TEMPLATE_ROWS: (string | number)[][] = [
  [...STUDENT_IMPORT_HEADERS],
  ['2024001', 'Ahmad Fauzi', 'X IPA 1', 'L', '', ''],
  ['2024002', 'Siti Aminah', 'X IPA 1', 'P', '', ''],
  ['2024003', 'Budi Santoso', 'X IPS 1', 'L', 'budi@sekolah.id', 'rahasia123'],
]

// ===== Normalisasi gender =====
export function normalizeGender(raw: string): 'L' | 'P' | null {
  const v = String(raw ?? '').trim().toUpperCase()
  if (['L', 'LAKI-LAKI', 'LAKI LAKI', 'M', 'MALE'].includes(v)) return 'L'
  if (['P', 'PEREMPUAN', 'F', 'FEMALE'].includes(v)) return 'P'
  return null
}

// ===== Validasi email =====
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export function isValidEmail(v: string): boolean {
  return EMAIL_RE.test(v)
}

// ===== Download template CSV =====
export function downloadStudentTemplate(): void {
  const csv = buildCsv(TEMPLATE_ROWS)
  downloadCsv('template-import-siswa.csv', csv)
}

// ===== Parse & validasi file CSV =====
export function parseStudentCsv(text: string): StudentImportParseResult {
  const errors: string[] = []
  const rows: StudentImportRow[] = []

  const grid = parseCSV(text)

  if (grid.length < 2) {
    return { rows: [], errors: ['File kosong atau tidak memiliki data'] }
  }

  // --- Header ---
  const header = grid[0]!.map(h => h.trim().toLowerCase())
  const idx = {
    nis: header.indexOf('nis'),
    name: header.indexOf('nama'),
    className: header.indexOf('kelas'),
    gender: header.indexOf('gender'),
    email: header.indexOf('email'),
    password: header.indexOf('password'),
  }

  if (idx.nis < 0 || idx.name < 0 || idx.className < 0 || idx.gender < 0) {
    return {
      rows: [],
      errors: ['Header wajib: NIS, Nama, Kelas, Gender (Email & Password opsional)'],
    }
  }

  // --- Batas baris ---
  const dataRows = grid.slice(1)
  if (dataRows.length > STUDENT_IMPORT_MAX_ROWS) {
    return {
      rows: [],
      errors: [`Maksimal ${STUDENT_IMPORT_MAX_ROWS} baris per import`],
    }
  }

  // --- Validasi per baris ---
  const seen = new Set<string>()

  dataRows.forEach((r, i) => {
    const rowNum = i + 2
    const nis = (r[idx.nis] ?? '').trim()
    const name = (r[idx.name] ?? '').trim()
    const className = (r[idx.className] ?? '').trim()
    const gender = normalizeGender(r[idx.gender] ?? '')
    const email = idx.email >= 0 ? (r[idx.email] ?? '').trim() : ''
    const password = idx.password >= 0 ? (r[idx.password] ?? '').trim() : ''

    if (!nis) errors.push(`Baris ${rowNum}: NIS wajib diisi`)
    if (!name) errors.push(`Baris ${rowNum}: Nama wajib diisi`)
    if (!className) errors.push(`Baris ${rowNum}: Kelas wajib diisi`)
    if (!gender) errors.push(`Baris ${rowNum}: Gender wajib L/P`)
    if (email && !isValidEmail(email))
      errors.push(`Baris ${rowNum}: Format email tidak valid`)
    if (nis && seen.has(nis))
      errors.push(`Baris ${rowNum}: NIS ${nis} duplikat di file`)
    if (nis) seen.add(nis)

    if (nis && name && className && gender) {
      rows.push({ nis, name, className, gender, email, password })
    }
  })

  return { rows, errors }
}

// ===== Validasi File (sebelum dibaca) =====
export function validateStudentFile(file: File): string | null {
  if (!file.name.toLowerCase().endsWith('.csv')) return 'File harus berformat .csv'
  if (file.size > STUDENT_IMPORT_MAX_BYTES) return 'Ukuran file maksimal 5 MB'
  return null
}

// ===== Prediksi email default (untuk preview) =====
export function defaultStudentEmail(nis: string): string {
  return `${nis}@siswa.sekolah.id`
}