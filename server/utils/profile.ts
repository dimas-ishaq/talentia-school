// server/utils/profile.ts
// Helper pembuatan / pembacaan profil (teachers, students, parents) per role.
// Dipakai oleh register, users (management), dan me (untuk cek kelengkapan).
import { eq } from 'drizzle-orm'
import { db } from './db'
import { parents, students, teachers, users, type User } from '../database/schema'

/** Buat baris profil sesuai role. Diluar admin (tidak punya profil). */
type DbTransaction = Pick<typeof db, 'insert' | 'delete'>

export function createProfileForRole(
  tx: DbTransaction,
  role: User['role'],
  userId: string,
  extra: Record<string, unknown> = {},
) {
  const id = crypto.randomUUID()
  if (role === 'teacher') {
    tx.insert(teachers).values({ id, userId, ...extra }).run()
  } else if (role === 'student') {
    tx.insert(students).values({ id, userId, ...extra }).run()
  } else if (role === 'parent') {
    tx.insert(parents).values({ id, userId, phone: '', ...extra }).run()
  }
}

/** Hapus baris profil sesuai role (saat role user diubah di management). */
export async function createProfileForRoleAsync(
  role: User['role'],
  userId: string,
  extra: Record<string, unknown> = {},
) {
  const id = crypto.randomUUID()
  if (role === 'teacher') await db.insert(teachers).values({ id, userId, ...extra } as any)
  else if (role === 'student') await db.insert(students).values({ id, userId, ...extra } as any)
  else if (role === 'parent') await db.insert(parents).values({ id, userId, phone: '', ...extra } as any)
}

export function deleteProfileForRole(tx: DbTransaction, role: User['role'], userId: string) {
  if (role === 'teacher') tx.delete(teachers).where(eq(teachers.userId, userId)).run()
  else if (role === 'student') tx.delete(students).where(eq(students.userId, userId)).run()
  else if (role === 'parent') tx.delete(parents).where(eq(parents.userId, userId)).run()
}

/** Cek kelengkapan profil. false = masih ada data wajib yang kosong (NIS/NIP/kelas/dll). */
export async function isProfileComplete(user: User) {
  if (user.role === 'teacher') {
    const row = await db.query.teachers.findFirst({
      where: eq(teachers.userId, user.id),
      columns: { nip: true },
    })
    return !!row && !!row.nip
  }
  if (user.role === 'student') {
    const row = await db.query.students.findFirst({
      where: eq(students.userId, user.id),
      columns: { nis: true, classId: true },
    })
    return !!row && !!row.nis && !!row.classId
  }
  return true // admin & parent dianggap lengkap
}