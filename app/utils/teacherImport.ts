import { parseCSV, buildCsv, downloadCsv } from './csv'

export type TeacherImportRow = { name: string; email: string; password: string; code: string; nip: string; phone: string; address: string; subject: string }
export const TEACHER_IMPORT_MAX_ROWS = 500
export const TEACHER_IMPORT_MAX_BYTES = 5 * 1024 * 1024

const TEMPLATE_ROWS = [
  ['Nama', 'Email', 'Password', 'Kode', 'NIP', 'Telepon', 'Alamat', 'Mapel'],
  ['Budi Santoso', 'budi@sekolah.id', 'rahasia123', 'G001', '19800101', '08123456789', 'Jl. Pendidikan 1', 'Matematika'],
]

export function downloadTeacherTemplate() { downloadCsv('template-import-guru.csv', buildCsv(TEMPLATE_ROWS)) }

export function parseTeacherCsv(text: string) {
  const grid = parseCSV(text); const errors: string[] = []; const rows: TeacherImportRow[] = []
  if (grid.length < 2) return { rows, errors: ['File kosong atau tidak memiliki data'] }
  const header = grid[0]!.map((x) => x.trim().toLowerCase())
  const index = (name: string) => header.indexOf(name)
  const required = ['nama', 'email', 'nip']
  if (required.some((name) => index(name) < 0)) return { rows, errors: ['Header wajib: Nama, Email, NIP (kolom lain opsional)'] }
  const data = grid.slice(1)
  if (data.length > TEACHER_IMPORT_MAX_ROWS) return { rows, errors: [`Maksimal ${TEACHER_IMPORT_MAX_ROWS} baris per import`] }
  const seen = new Set<string>()
  data.forEach((line, i) => {
    const value = (name: string) => (line[index(name)] ?? '').trim()
    const row = { name: value('nama'), email: value('email'), password: value('password'), code: value('kode'), nip: value('nip'), phone: value('telepon'), address: value('alamat'), subject: value('mapel') }
    const n = i + 2
    if (!row.name) errors.push(`Baris ${n}: Nama wajib diisi`)
    if (!/^\S+@\S+\.\S+$/.test(row.email)) errors.push(`Baris ${n}: Format email tidak valid`)
    if (!row.nip) errors.push(`Baris ${n}: NIP wajib diisi`)
    if (seen.has(row.nip)) errors.push(`Baris ${n}: NIP ${row.nip} duplikat di file`)
    seen.add(row.nip)
    if (row.name && row.email && row.nip && /^\S+@\S+\.\S+$/.test(row.email)) rows.push(row)
  })
  return { rows, errors }
}

export function validateTeacherFile(file: File) {
  if (!file.name.toLowerCase().endsWith('.csv')) return 'File harus berformat .csv'
  if (file.size > TEACHER_IMPORT_MAX_BYTES) return 'Ukuran file maksimal 5 MB'
  return null
}
