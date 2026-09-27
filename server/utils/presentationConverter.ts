// Pipeline konversi PPT/PPTX ke PDF menggunakan LibreOffice headless.
// Dipakai oleh endpoint upload presentasi.
import { spawn } from 'node:child_process'
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { extname, join } from 'node:path'
import { findLibreOffice } from '~~/server/utils/libreOfficeDetector'

export type ConvertResult = {
  pdf: Buffer
  pdfBytes: number
  pageCount: number | null
  converter: 'libreoffice' | 'skipped'
  warnings: string[]
}

const CONVERT_TIMEOUT_MS = Number(process.env.PRESENTATION_CONVERT_TIMEOUT_MS || 60_000)

async function fileExists(path: string) {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

export async function convertOfficeToPdf(input: {
  buffer: Buffer
  filename: string
}): Promise<ConvertResult> {
  const ext = extname(input.filename).toLowerCase()
  if (!['.ppt', '.pptx'].includes(ext)) {
    throw new Error(`Ekstensi tidak didukung untuk konversi: ${ext || '(tanpa ekstensi)'}`)
  }

  const workdir = join(tmpdir(), `presentation-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
  await mkdir(workdir, { recursive: true })

  const inputPath = join(workdir, `source${ext}`)
  await writeFile(inputPath, input.buffer)

  const outputDir = join(workdir, 'out')
  await mkdir(outputDir, { recursive: true })

  const warnings: string[] = []
  const args = [
    '--headless',
    '--norestore',
    '--nolockcheck',
    '--nodefault',
    '--nofirststartwizard',
    '--convert-to',
    'pdf',
    '--outdir',
    outputDir,
    inputPath,
  ]

  let converter: 'libreoffice' | 'skipped' = 'skipped'
  let pdfPath: string | null = null
  const soffice = process.env.LIBREOFFICE_BIN || await findLibreOffice()

  if (!soffice) {
    warnings.push('LibreOffice tidak ditemukan. Install LibreOffice atau gunakan Docker production.')
  } else try {
    await runProcess(soffice, args, CONVERT_TIMEOUT_MS, workdir)
    pdfPath = join(outputDir, 'source.pdf')
    if (!(await fileExists(pdfPath))) {
      warnings.push('LibreOffice tidak menghasilkan file PDF.')
    } else {
      converter = 'libreoffice'
    }
  } catch (error) {
    warnings.push(
      `Konversi otomatis gagal (${(error as Error).message}). File asli akan dipakai untuk viewer eksternal.`,
    )
  }

  if (!pdfPath || !(await fileExists(pdfPath))) {
    await rm(workdir, { recursive: true, force: true })
    return {
      pdf: Buffer.alloc(0),
      pdfBytes: 0,
      pageCount: null,
      converter,
      warnings,
    }
  }

  const pdf = await readFile(pdfPath)
  const pageCount = countPdfPages(pdf)
  await rm(workdir, { recursive: true, force: true })
  return {
    pdf,
    pdfBytes: pdf.length,
    pageCount,
    converter,
    warnings,
  }
}

function runProcess(bin: string, args: string[], timeoutMs: number, workdir: string) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stderr = ''
    let stdout = ''
    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      reject(new Error(`Konversi timeout setelah ${Math.round(timeoutMs / 1000)} detik`))
    }, timeoutMs)

    child.stderr.on('data', (chunk) => { stderr += chunk.toString() })
    child.stdout.on('data', (chunk) => { stdout += chunk.toString() })

    child.on('error', (error) => {
      clearTimeout(timer)
      const message = error.message.includes('ENOENT')
        ? `LibreOffice (${bin}) tidak ditemukan di server`
        : error.message
      reject(new Error(message))
    })

    child.on('exit', (code) => {
      clearTimeout(timer)
      if (code === 0) {
        resolve()
        return
      }
      reject(new Error(`LibreOffice keluar dengan kode ${code}: ${stderr.trim() || stdout.trim() || 'tidak ada pesan'}`))
    })
  })
}


// Hitung jumlah halaman PDF dengan memindai token "/Type /Page" pada objek halaman.
// Sederhana, cukup untuk badge UI; pdfjs-dist tetap hitung presisi di klien.
export function countPdfPages(pdf: Buffer): number | null {
  const text = pdf.toString('latin1')
  const matches = text.match(/\/Type\s*\/Page\b(?!s)/g)
  if (!matches) return null
  return matches.length
}