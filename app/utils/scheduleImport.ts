// app/utils/scheduleImport.ts
// Semua logika IMPORT jadwal dari CSV: template, parsing, dan validasi format.
// Pola sama dengan utils/studentImport.ts.
import { parseCSV, buildCsv, downloadCsv } from './csv'

// ===== Tipe =====
export type ScheduleImportRow = {
  dayOfWeek: number      // 1-6
  startTime: string      // "07:00"
  endTime: string        // "08:30"
  subject: string        // kode ATAU nama mapel (server yang cocokkan)
  className: string      // nama kelas, mis. "11 RPL 1"
  teacherName: string    // nama guru (wajib)
  room: string
  note: string
}

export type ScheduleImportParseResult = {
  rows: ScheduleImportRow[]
  errors: string[]
}

// ===== Konstanta =====
export const SCHEDULE_IMPORT_MAX_ROWS = 500
export const SCHEDULE_IMPORT_MAX_BYTES = 5 * 1024 * 1024 // 5 MB
export const SCHEDULE_IMPORT_HEADERS = [
  'Hari', 'Jam Mulai', 'Jam Selesai', 'Mapel', 'Kelas', 'Guru', 'Ruangan', 'Catatan',
] as const

// Contoh dummy isi template (SMK jurusan RPL) agar admin tinggal ganti isinya.
const TEMPLATE_ROWS: string[][] = [
  [...SCHEDULE_IMPORT_HEADERS],
  ['Senin', '07:00', '08:30', 'Matematika', '11 RPL 1', 'Budi Santoso', 'Lab RPL 1', ''],
  ['Senin', '08:30', '10:00', 'Bahasa Indonesia', '11 RPL 1', 'Siti Aminah', '', ''],
  ['Senin', '10:15', '11:45', 'Pemrograman Web', '11 RPL 1', 'Andi Pratama', 'Lab Komputer 1', 'Bawa laptop'],
  ['Selasa', '07:00', '08:30', 'Matematika', '11 RPL 2', 'Budi Santoso', '', ''],
  ['Selasa', '08:30', '10:00', 'Pemrograman Web', '11 RPL 2', 'Andi Pratama', 'Lab Komputer 2', ''],
  ['Rabu', '07:00', '08:30', 'Basis Data', '12 RPL 1', 'Dewi Lestari', 'Lab Komputer 2', ''],
]

// ===== Normalisasi hari =====
const DAY_MAP: Record<string, number> = {
  senin: 1, selasa: 2, rabu: 3, kamis: 4, jumat: 5, sabtu: 6,
  // variasi ejaan
  "jum'at": 5, minggu: 0, ahad: 0,
}

export function normalizeDay(raw: string): number | null {
  const v = String(raw ?? '').trim().toLowerCase()
  if (!v) return null
  // Angka langsung (1-6)
  if (/^[1-6]$/.test(v)) return Number(v)
  return DAY_MAP[v] ?? null
}

// ===== Normalisasi jam: "7:00" / "07.00" / "0700" → "07:00" =====
export function normalizeTime(raw: string): string | null {
  const v = String(raw ?? '').trim().replace('.', ':')
  let h = ''
  let m = ''
  if (/^\d{1,2}:\d{2}$/.test(v)) {
    const [hh, mm] = v.split(':')
    h = hh!
    m = mm!
  } else if (/^\d{3,4}$/.test(v)) {
    h = v.slice(0, v.length - 2)
    m = v.slice(-2)
  } else {
    return null
  }
  const hh = Number(h)
  const mm = Number(m)
  if (Number.isNaN(hh) || Number.isNaN(mm) || hh > 23 || mm > 59) return null
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

/** "07:00" → menit, untuk membandingkan jam mulai/selesai. */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':')
  return Number(h) * 60 + Number(m)
}

// ===== Download template CSV =====
export function downloadScheduleTemplate(): void {
  const csv = buildCsv(TEMPLATE_ROWS)
  downloadCsv('template-import-jadwal.csv', csv)
}

// ===== Parse & validasi file CSV =====
export function parseScheduleCsv(text: string): ScheduleImportParseResult {
  const errors: string[] = []
  const rows: ScheduleImportRow[] = []

  const grid = parseCSV(text)
  if (grid.length < 2) {
    return { rows: [], errors: ['File kosong atau tidak memiliki data'] }
  }

  // --- Header ---
  const header = grid[0]!.map(h => h.trim().toLowerCase())
  const idx = {
    hari: header.indexOf('hari'),
    mulai: header.indexOf('jam mulai'),
    selesai: header.indexOf('jam selesai'),
    mapel: header.indexOf('mapel'),
    kelas: header.indexOf('kelas'),
    guru: header.indexOf('guru'),
    ruangan: header.indexOf('ruangan'),
    catatan: header.indexOf('catatan'),
  }

  if (idx.hari < 0 || idx.mulai < 0 || idx.selesai < 0 || idx.mapel < 0 || idx.kelas < 0 || idx.guru < 0) {
    return {
      rows: [],
      errors: ['Header wajib: Hari, Jam Mulai, Jam Selesai, Mapel, Kelas, Guru (Ruangan, Catatan opsional)'],
    }
  }

  // --- Batas baris ---
  const dataRows = grid.slice(1)
  if (dataRows.length > SCHEDULE_IMPORT_MAX_ROWS) {
    return { rows: [], errors: [`Maksimal ${SCHEDULE_IMPORT_MAX_ROWS} baris per import`] }
  }

  // --- Validasi per baris ---
  dataRows.forEach((r, i) => {
    const rowNum = i + 2
    const day = normalizeDay(r[idx.hari] ?? '')
    const start = normalizeTime(r[idx.mulai] ?? '')
    const end = normalizeTime(r[idx.selesai] ?? '')
    const subject = (r[idx.mapel] ?? '').trim()
    const className = (r[idx.kelas] ?? '').trim()
    const teacherName = idx.guru >= 0 ? (r[idx.guru] ?? '').trim() : ''
    const room = idx.ruangan >= 0 ? (r[idx.ruangan] ?? '').trim() : ''
    const note = idx.catatan >= 0 ? (r[idx.catatan] ?? '').trim() : ''

    let ok = true
    if (!day) { errors.push(`Baris ${rowNum}: Hari tidak valid (pakai Senin-Sabtu)`); ok = false }
    if (!start) { errors.push(`Baris ${rowNum}: Jam Mulai tidak valid (contoh 07:00)`); ok = false }
    if (!end) { errors.push(`Baris ${rowNum}: Jam Selesai tidak valid (contoh 08:30)`); ok = false }
    if (start && end && timeToMinutes(end) <= timeToMinutes(start)) {
      errors.push(`Baris ${rowNum}: Jam Selesai harus lebih besar dari Jam Mulai`); ok = false
    }
    if (!subject) { errors.push(`Baris ${rowNum}: Mapel wajib diisi`); ok = false }
    if (!className) { errors.push(`Baris ${rowNum}: Kelas wajib diisi`); ok = false }
    if (!teacherName) { errors.push(`Baris ${rowNum}: Guru wajib diisi`); ok = false }

    if (ok) {
      rows.push({
        dayOfWeek: day!,
        startTime: start!,
        endTime: end!,
        subject,
        className,
        teacherName,
        room,
        note,
      })
    }
  })

  return { rows, errors }
}

// ===== Validasi File (sebelum dibaca) =====
export function validateScheduleFile(file: File): string | null {
  if (!file.name.toLowerCase().endsWith('.csv')) return 'File harus berformat .csv'
  if (file.size > SCHEDULE_IMPORT_MAX_BYTES) return 'Ukuran file maksimal 5 MB'
  return null
}
