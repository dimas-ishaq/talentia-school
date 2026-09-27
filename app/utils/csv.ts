// utils/csv.ts

/**
 * Parse CSV text menjadi array of array.
 * - Support quoted fields ("...") dan escaped quote ("").
 * - Support LF & CRLF.
 * - Baris kosong otomatis di-skip.
 */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cur = ''
  let inQuote = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuote) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++ }
      else if (c === '"') inQuote = false
      else cur += c
    } else {
      if (c === '"') inQuote = true
      else if (c === ',') { row.push(cur); cur = '' }
      else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = '' }
      else if (c === '\r') { /* skip */ }
      else cur += c
    }
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row) }

  return rows.filter(r => r.some(cell => cell.trim() !== ''))
}

/**
 * Escape satu cell CSV (bungkus quote jika mengandung , " atau newline).
 */
export function escapeCsvCell(value: unknown): string {
  const s = String(value ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/**
 * Bangun string CSV dari array of array.
 * @param rows - array baris
 * @param options.bom - tambahkan BOM UTF-8 (default true, agar Excel baca dengan benar)
 * @param options.eol - end-of-line (default '\r\n')
 */
export function buildCsv(
  rows: unknown[][],
  options: { bom?: boolean; eol?: string } = {}
): string {
  const { bom = true, eol = '\r\n' } = options
  const body = rows.map(r => r.map(escapeCsvCell).join(',')).join(eol)
  return (bom ? '\uFEFF' : '') + body
}

/**
 * Trigger download file CSV di browser.
 * Punya fallback ke data URI + dukungan IE/Edge lama.
 * Mengembalikan pesan error agar UI bisa menampilkannya tanpa `alert()`.
 */
export function downloadCsv(filename: string, csvContent: string): string | null {
  const mime = 'text/csv;charset=utf-8;'

  try {
    const blob = new Blob([csvContent], { type: mime })

    // IE / Edge lama
    const nav = window.navigator as any
    if (nav.msSaveBlob) {
      nav.msSaveBlob(blob, filename)
      return null
    }

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    return null
  } catch {
    // Fallback: data URI
    try {
      const encoded = encodeURIComponent(csvContent)
      const link = document.createElement('a')
      link.href = `data:${mime},${encoded}`
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      return null
    } catch {
      return 'Gagal mengunduh file. Coba browser lain atau nonaktifkan pemblokir unduhan.'
    }
  }
}