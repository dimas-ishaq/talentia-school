// PATCH /api/auth/profile — lengkapi profil sendiri (guru: NIP; siswa: NIS + kelas).
// Batch 1: agar banner "profil belum lengkap" punya jalan keluar tanpa hubungi admin.
// Admin tetap melengkapi lewat jalur management; route ini hanya menulis milik sendiri.
import { z } from 'zod'
import { eq, and, ne } from 'drizzle-orm'
import { classes, students, teachers, users } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { isProfileComplete } from '~~/server/utils/profile'
import { requireOrganization } from '~~/server/utils/tenant'

const schema = z.object({
  name: z.string().trim().min(2, 'Nama minimal 2 karakter').max(100).optional(),
  nip: z.string().trim().min(1, 'NIP wajib diisi').max(30).optional(),
  nis: z.string().trim().min(1, 'NIS wajib diisi').max(30).optional(),
  classId: z.string().trim().min(1, 'Kelas wajib dipilih').optional(),
})

export default defineEventHandler(async (event) => {
  const { user, organization } = await requireOrganization(event)
  if (user.role !== 'teacher' && user.role !== 'student') {
    throw createError({ statusCode: 403, statusMessage: 'Hanya guru dan siswa yang perlu melengkapi profil' })
  }
  const body = schema.parse(await readBody(event))

  if (body.name) {
    await db.update(users).set({ name: body.name }).where(eq(users.id, user.id))
  }

  if (user.role === 'teacher') {
    if (!body.nip) throw createError({ statusCode: 400, statusMessage: 'NIP wajib diisi' })
    const duplicate = await db.query.teachers.findFirst({
      where: and(eq(teachers.nip, body.nip), eq(teachers.organizationId, organization.id), ne(teachers.userId, user.id)),
      columns: { id: true },
    })
    if (duplicate) throw createError({ statusCode: 409, statusMessage: `NIP ${body.nip} sudah digunakan` })
    await db.update(teachers).set({ nip: body.nip }).where(eq(teachers.userId, user.id))
  } else {
    if (!body.nis || !body.classId) {
      throw createError({ statusCode: 400, statusMessage: 'NIS dan kelas wajib diisi' })
    }
    const classRow = await db.query.classes.findFirst({
      where: and(eq(classes.id, body.classId), eq(classes.organizationId, organization.id)),
      columns: { id: true },
    })
    if (!classRow) throw createError({ statusCode: 404, statusMessage: 'Kelas tidak ditemukan' })
    const duplicate = await db.query.students.findFirst({
      where: and(eq(students.nis, body.nis), eq(students.organizationId, organization.id), ne(students.userId, user.id)),
      columns: { id: true },
    })
    if (duplicate) throw createError({ statusCode: 409, statusMessage: `NIS ${body.nis} sudah digunakan` })
    await db.update(students).set({ nis: body.nis, classId: body.classId }).where(eq(students.userId, user.id))
  }

  const row = await db.query.users.findFirst({ where: eq(users.id, user.id) })
  const profileComplete = row ? await isProfileComplete(row) : false
  await setUserSession(event, {
    user: { ...user, name: body.name ?? user.name, profileComplete } as never,
    loggedInAt: new Date().toISOString(),
  })
  return { success: true, profileComplete }
})
