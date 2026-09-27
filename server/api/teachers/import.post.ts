import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import bcrypt from 'bcrypt'
import { db } from '~~/server/utils/db'
import { teachers, users } from '~~/server/database/schema'
import { requireOrganizationAdmin } from '~~/server/utils/tenant'

const rowSchema = z.object({
  name: z.string().min(1).max(100), email: z.string().email(), password: z.string().optional().default(''),
  code: z.string().max(30).optional().default(''), nip: z.string().min(1).max(30), phone: z.string().max(50).optional().default(''),
  address: z.string().max(255).optional().default(''), subject: z.string().max(100).optional().default(''),
})
const bodySchema = z.object({ teachers: rowSchema.array().min(1).max(500) })

export default defineEventHandler(async (event) => {
  const { organization } = await requireOrganizationAdmin(event)
  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: parsed.error.issues[0]?.message ?? 'Data import tidak valid' })
  let success = 0
  const errors: string[] = []
  for (let i = 0; i < parsed.data.teachers.length; i++) {
    const row = parsed.data.teachers[i]!
    const line = i + 2
    const duplicateNip = await db.query.teachers.findFirst({ where: and(eq(teachers.nip, row.nip), eq(teachers.organizationId, organization.id)), columns: { id: true } })
    if (duplicateNip) { errors.push(`Baris ${line}: NIP ${row.nip} sudah terdaftar, dilewati`); continue }
    const duplicateEmail = await db.query.users.findFirst({ where: eq(users.email, row.email), columns: { id: true } })
    if (duplicateEmail) { errors.push(`Baris ${line}: email ${row.email} sudah digunakan, dilewati`); continue }
    try {
      const password = await bcrypt.hash(row.password || row.nip, 10)
      await db.transaction(async (tx) => {
        const userId = crypto.randomUUID()
        await tx.insert(users).values({ id: userId, organizationId: organization.id, email: row.email, name: row.name, password, role: 'teacher' })
        await tx.insert(teachers).values({ id: crypto.randomUUID(), organizationId: organization.id, userId, code: row.code || null, nip: row.nip, phone: row.phone || null, address: row.address || null, subject: row.subject || null })
      })
      success++
    } catch { errors.push(`Baris ${line}: gagal menyimpan ${row.nip}`) }
  }
  return { success, failed: errors.length, errors }
})
