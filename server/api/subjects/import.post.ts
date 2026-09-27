// server/api/subjects/import.post.ts
// POST /api/subjects/import — import banyak mapel dari CSV.
// Body: { subjects: [{ code, name, description? }] }
import { db } from '~~/server/utils/db'
import { subjects } from '~~/server/database/schema'
import { z } from 'zod'
import { requireAdmin } from '~~/server/utils/requireAdmin'

const importRowSchema = z.object({
  code: z.string().min(1).max(10),
  name: z.string().min(1).max(50),
  description: z.string().max(255).optional().default(''),
})

const importBodySchema = z.object({
  subjects: importRowSchema.array().min(1, 'Tidak ada data').max(500),
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody(event)
  const parsed = importBodySchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message ?? 'Data import tidak valid',
    })
  }

  // Preload existing subjects untuk cek duplikat
  const existing = await db.query.subjects.findMany({
    columns: { id: true, code: true, name: true },
  })
  const codeMap = new Map(existing.map(s => [s.code, s.id]))
  const nameMap = new Map(existing.map(s => [s.name.toLowerCase(), s.id]))

  let success = 0
  const errors: string[] = []

  for (let i = 0; i < parsed.data.subjects.length; i++) {
    const row = parsed.data.subjects[i]!
    const line = i + 2
    const code = row.code.trim().toUpperCase()
    const name = row.name.trim()
    const description = row.description?.trim() || null

    // Duplikat kode
    if (codeMap.has(code)) {
      errors.push(`Baris ${line}: kode "${code}" sudah ada, dilewati`)
      continue
    }

    // Duplikat nama
    if (nameMap.has(name.toLowerCase())) {
      errors.push(`Baris ${line}: nama "${name}" sudah ada, dilewati`)
      continue
    }

    try {
      await db.insert(subjects).values({
        id: crypto.randomUUID(),
        code,
        name,
        description,
      })
      codeMap.set(code, 'new')
      nameMap.set(name.toLowerCase(), 'new')
      success++
    } catch {
      errors.push(`Baris ${line}: gagal menyimpan "${code}"`)
    }
  }

  return { success, failed: errors.length, errors }
})
