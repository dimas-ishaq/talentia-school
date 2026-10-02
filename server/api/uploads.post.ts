// server/api/uploads.post.ts
import { mkdir, writeFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { getUploadMaxBytes } from '~~/server/utils/uploadSettings'
import { writeAuditLog } from '~~/server/utils/audit'

const ALLOWED_EXT = new Set(['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.txt', '.csv', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.mp4', '.webm', '.mov'])
const VIDEO_EXT = new Set(['.mp4', '.webm', '.mov'])
const ALLOWED_MIME = new Set(['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain', 'text/csv', 'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'])
const KIND: Record<string, string> = { '.pdf': 'pdf', '.doc': 'document', '.docx': 'document', '.ppt': 'presentation', '.pptx': 'presentation', '.xls': 'spreadsheet', '.xlsx': 'spreadsheet', '.txt': 'text', '.csv': 'spreadsheet', '.png': 'image', '.jpg': 'image', '.jpeg': 'image', '.gif': 'image', '.webp': 'image', '.mp4': 'video', '.webm': 'video', '.mov': 'video' }

export default defineEventHandler(async (event) => {
  const { user, organization } = await requireOrganization(event)
  if (!['admin', 'org_admin', 'owner', 'teacher', 'student'].includes(user.role)) throw createError({ statusCode: 403, statusMessage: 'Akun tidak dapat mengunggah file' })
  const form = await readMultipartFormData(event)
  const filePart = form?.find((part) => part.name === 'file' && part.filename)
  if (!filePart) throw createError({ statusCode: 400, statusMessage: 'File tidak ditemukan pada request' })
  const ext = extname(filePart.filename ?? '').toLowerCase()
  const mime = String(filePart.type || '').toLowerCase()
  const organizationId = (user as { organizationId?: string }).organizationId
  const maxBytes = await getUploadMaxBytes(organizationId) * (VIDEO_EXT.has(ext) ? 50 : 1)
  if (filePart.data.length > maxBytes) throw createError({ statusCode: 400, statusMessage: `Ukuran file maksimal ${maxBytes / 1024 / 1024} MB` })
  if (ext === '.svg' || !ALLOWED_EXT.has(ext) || !ALLOWED_MIME.has(mime)) throw createError({ statusCode: 400, statusMessage: 'Tipe file tidak sesuai atau tidak diizinkan' })
  if (VIDEO_EXT.has(ext) && !mime.startsWith('video/')) throw createError({ statusCode: 400, statusMessage: 'MIME type video tidak valid' })
  const fileName = `${crypto.randomUUID()}${ext}`
  const dir = join(process.cwd(), 'public', 'uploads')
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, fileName), filePart.data)
  await writeAuditLog({ userId: user.id, action: 'upload.create', target: fileName, metadata: { originalName: filePart.filename, mime, size: filePart.data.length } })
  return { success: true, data: { name: filePart.filename, url: `/uploads/${fileName}`, kind: KIND[ext] ?? 'file', size: filePart.data.length } }
})
