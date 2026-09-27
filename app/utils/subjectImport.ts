import { parseCSV, buildCsv, downloadCsv } from './csv'

export type SubjectImportRow = { code: string; name: string; description: string }
export const SUBJECT_IMPORT_MAX_ROWS = 500
const HEADERS = ['Kode', 'Nama', 'Deskripsi'] as const

export function downloadSubjectTemplate() {
  downloadCsv('template-import-mapel.csv', buildCsv([[...HEADERS], ['MTK', 'Matematika', ''], ['IPA', 'Ilmu Pengetahuan Alam', '']]))
}

export function parseSubjectCsv(text: string): { rows: SubjectImportRow[]; errors: string[] } {
  const grid = parseCSV(text), errors: string[] = [], rows: SubjectImportRow[] = []
  if (grid.length < 2) return { rows, errors: ['File kosong atau tidak memiliki data'] }
  const header = grid[0]!.map(v => v.trim().toLowerCase())
  const idx = { code: header.indexOf('kode'), name: header.indexOf('nama'), description: header.indexOf('deskripsi') }
  if (idx.code < 0 || idx.name < 0) return { rows, errors: ['Header wajib: Kode, Nama (Deskripsi opsional)'] }
  const data = grid.slice(1)
  if (data.length > SUBJECT_IMPORT_MAX_ROWS) return { rows, errors: [`Maksimal ${SUBJECT_IMPORT_MAX_ROWS} baris per import`] }
  const seen = new Set<string>()
  data.forEach((r, i) => {
    const line = i + 2, code = (r[idx.code] ?? '').trim().toUpperCase(), name = (r[idx.name] ?? '').trim(), description = idx.description >= 0 ? (r[idx.description] ?? '').trim() : ''
    if (!code) errors.push(`Baris ${line}: Kode mapel wajib diisi`); else if (code.length > 10) errors.push(`Baris ${line}: Kode maksimal 10 karakter`)
    if (!name) errors.push(`Baris ${line}: Nama mapel wajib diisi`); else if (name.length > 50) errors.push(`Baris ${line}: Nama maksimal 50 karakter`)
    if (description.length > 255) errors.push(`Baris ${line}: Deskripsi maksimal 255 karakter`)
    const key = `${code}|${name.toLowerCase()}`
    if (seen.has(key)) errors.push(`Baris ${line}: Kode dan nama duplikat di file`)
    if (code && name && description.length <= 255 && !seen.has(key)) rows.push({ code, name, description })
    seen.add(key)
  })
  return { rows, errors }
}

export function validateSubjectFile(file: File) { return !file.name.toLowerCase().endsWith('.csv') ? 'File harus berformat .csv' : file.size > 5 * 1024 * 1024 ? 'Ukuran file maksimal 5 MB' : null }
