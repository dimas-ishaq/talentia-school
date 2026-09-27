// server/api/teachers/index.post.ts
import { db } from '~~/server/utils/db'
import { teachers, users } from '~~/server/database/schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import bcrypt from 'bcrypt'
import { requireOrganizationAdmin } from '~~/server/utils/tenant'

const createTeacherSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi').max(100),
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  code: z.string().optional().default(''),
  nip: z.string().min(1, 'NIP wajib diisi').max(30),
  phone: z.string().optional().default(''),
  address: z.string().optional().default(''),
  subject: z.string().optional().default(''),
})

export default defineEventHandler(async (event) => {
  const { organization } = await requireOrganizationAdmin(event)
  const body = await readBody(event)
  const parsed = createTeacherSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message ?? 'Data tidak valid',
    })
  }

  const data = parsed.data

  // 1) Cek NIP duplikat
  const existingNip = await db.query.teachers.findFirst({
    where: and(eq(teachers.nip, data.nip), eq(teachers.organizationId, organization.id)),
    columns: { id: true },
  })
  if (existingNip) {
    throw createError({
      statusCode: 409,
      statusMessage: `NIP ${data.nip} sudah terdaftar`,
    })
  }

  // 2) Cek email duplikat
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, data.email),
    columns: { id: true },
  })
  if (existingUser) {
    throw createError({
      statusCode: 409,
      statusMessage: `Email ${data.email} sudah digunakan`,
    })
  }

  // 3) Hash password
  const hashedPassword = await bcrypt.hash(data.password, 10)

  // 4) Transaksi: buat user + guru
  const teacherId = await db.transaction(async (tx) => {
    const userId = crypto.randomUUID()
    const newTeacherId = crypto.randomUUID()

    await tx.insert(users).values({
      id: userId,
      organizationId: organization.id,
      email: data.email,
      name: data.name,
      password: hashedPassword,
      role: 'teacher',
    })

    await tx.insert(teachers).values({
      id: newTeacherId,
      organizationId: organization.id,
      userId,
      code: data.code || null,
      nip: data.nip,
      phone: data.phone || null,
      address: data.address || null,
      subject: data.subject || null,
    })

    return newTeacherId
  })

  return {
    success: true,
    data: { id: teacherId },
    message: 'Guru berhasil ditambahkan',
  }
})