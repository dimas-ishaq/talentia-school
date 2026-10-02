import { mkdir, writeFile } from 'node:fs/promises'
import { extname, join, basename } from 'node:path'
import { getUploadMaxBytes } from '~~/server/utils/uploadSettings'
import { writeAuditLog } from '~~/server/utils/audit'
import { convertOfficeToPdf } from '~~/server/utils/presentationConverter'
import { findLibreOffice } from '~~/server/utils/libreOfficeDetector'

const ALLOWED = new Set(['.ppt', '.pptx'])
const MIME = new Set([
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
])

export default defineEventHandler(async (event) => {
  const { user, organization } = await requireOrganization(event)
  if (!['admin', 'org_admin', 'owner', 'teacher'].includes(user.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Hanya guru atau admin yang dapat mengunggah presentasi' })
  }

  const form = await readMultipartFormData(event)
  const file = form?.find((part) => part.name === 'file' && part.filename)
  if (!file?.filename) throw createError({ statusCode: 400, statusMessage: 'File presentasi tidak ditemukan' })

  const ext = extname(file.filename).toLowerCase()
  const mime = String(file.type || '').toLowerCase()
  if (!ALLOWED.has(ext) || !MIME.has(mime)) {
    throw createError({ statusCode: 400, statusMessage: 'Gunakan file PowerPoint .ppt atau .pptx' })
  }

  const maxBytes = await getUploadMaxBytes((user as { organizationId?: string }).organizationId)
  if (file.data.length > maxBytes) {
    throw createError({ statusCode: 400, statusMessage: `Ukuran file maksimal ${maxBytes / 1024 / 1024} MB` })
  }

  const dir = join(process.cwd(), 'public', 'uploads')
  await mkdir(dir, { recursive: true })

  const id = crypto.randomUUID()
  const originalName = `${id}${ext}`
  const originalPath = join(dir, originalName)
  await writeFile(originalPath, file.data)

  // Strategi renderer:
  //   .pptx → pptx-browser (client-side, tanpa server). LibreOffice tidak dipakai.
  //   .ppt  → pptx-browser tidak mendukung format lama, fallback ke konversi LibreOffice jika tersedia.
  //           Bila LibreOffice tidak tersedia, file tetap dapat diunduh/dibuka via Office Online Viewer.
  const warnings: string[] = []
  let pdfUrl: string | null = null
  let converter: 'browser' | 'libreoffice' | 'skipped' = 'browser'
  let pageCount: number | null = null

  if (ext === '.pptx') {
    converter = 'browser'
    pageCount = null
  } else {
    const soffice = await findLibreOffice()
    if (soffice) {
      try {
        const converted = await convertOfficeToPdf({ buffer: file.data, filename: file.filename })
        if (converted.pdf.length) {
          const pdfName = `${id}.pdf`
          await writeFile(join(dir, pdfName), converted.pdf)
          pdfUrl = `/uploads/${pdfName}`
          pageCount = converted.pageCount
          converter = 'libreoffice'
          if (converted.warnings.length) warnings.push(...converted.warnings)
        } else {
          converter = 'skipped'
          warnings.push('Format .ppt lama tidak dapat dikonversi di server ini. Siswa akan membuka file via Office Online Viewer.')
        }
      } catch (err) {
        converter = 'skipped'
        warnings.push(`Konversi otomatis gagal (${(err as Error).message}). File asli akan dipakai untuk viewer eksternal.`)
      }
    } else {
      converter = 'skipped'
      warnings.push('LibreOffice tidak ditemukan di server dan format .ppt tidak dapat dirender langsung. Siswa akan membuka file via Office Online Viewer.')
    }
  }

  await writeAuditLog({
    userId: user.id,
    action: 'presentation.upload',
    target: originalName,
    metadata: { originalName: basename(file.filename), mime, size: file.data.length, pdf: !!pdfUrl, converter, ext },
  })

  return {
    success: true,
    data: {
      name: file.filename,
      originalUrl: `/uploads/${originalName}`,
      fileUrl: pdfUrl,
      kind: 'presentation',
      pageCount,
      converter,
      warnings,
    },
  }
})
