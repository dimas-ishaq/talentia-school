// server/api/auth/login.post.ts
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { loginSchema } from '~~/shared/schemas/auth'
import { users, students, teachers } from "~~/server/database/schema";
import { ensureOrganization } from '~~/server/utils/db'
import { isProfileComplete } from "~~/server/utils/profile";
import type { H3Event } from 'h3'
import { writeAuditLog } from '~~/server/utils/audit'

const attempts = new Map<string, { count: number; resetAt: number }>()
const MAX_ATTEMPTS = 5
const WINDOW_MS = 60_000
const CLEANUP_MS = 5 * 60_000
let lastCleanup = 0

function clientKey(event: H3Event) {
  return getRequestIP(event, { xForwardedFor: true }) || 'unknown'
}

const bodySchema = loginSchema

export default defineEventHandler(async (event) => {
  const key = clientKey(event)
  const now = Date.now()
  if (now - lastCleanup > CLEANUP_MS) {
    for (const [entryKey, entry] of attempts) if (entry.resetAt <= now) attempts.delete(entryKey)
    lastCleanup = now
  }
  const current = attempts.get(key)
  if (current && current.resetAt > now && current.count >= MAX_ATTEMPTS) {
    throw createError({ statusCode: 429, statusMessage: 'Terlalu banyak percobaan login. Coba lagi dalam satu menit.' })
  }
  const { email, password } = await readValidatedBody(event, bodySchema.parse);

  const user = await db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase()),
  });

  // ✅ Pakai bcrypt (native)
  if (!user || !(await bcrypt.compare(password, user.password))) {
    const previous = attempts.get(key)
    const active = previous && previous.resetAt > now
    attempts.set(key, { count: (active ? previous.count : 0) + 1, resetAt: active ? previous.resetAt : now + WINDOW_MS })
    await writeAuditLog({ action: 'auth.login_failed', target: email.toLowerCase(), metadata: { ip: key } })
    throw createError({
      statusCode: 401,
      statusMessage: "Email atau password salah",
    });
  }

  // Akun guru/siswa yang dinonaktifkan tidak boleh login
  if (user.role === 'student' || user.role === 'teacher') {
    const profile = user.role === 'student'
      ? await db.query.students.findFirst({
          where: eq(students.userId, user.id),
          columns: { isActive: true },
        })
      : await db.query.teachers.findFirst({
          where: eq(teachers.userId, user.id),
          columns: { isActive: true },
        })
    if (profile && profile.isActive === false) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Akun Anda dinonaktifkan. Hubungi admin sekolah.',
      })
    }
  }

  attempts.delete(key)
  const organizationId = await ensureOrganization(user)
  await writeAuditLog({ userId: user.id, action: 'auth.login_success', target: user.id, metadata: { ip: key } })
  const profileComplete = await isProfileComplete(user)
  const role = user.role
  const platformRole = (user as { platformRole?: string | null }).platformRole ?? null

  await setUserSession(event, {
    user: {
      id: user.id,
      organizationId,
      email: user.email,
      name: user.name,
      role,
      platformRole,
      mustChangePassword: (user as { mustChangePassword?: boolean }).mustChangePassword ?? false,
      profileComplete,
    } as never,
    loggedInAt: new Date().toISOString(),
  });

  return {
    success: true,
    user: {
      id: user.id,
      organizationId,
      email: user.email,
      name: user.name,
      role,
      platformRole,
      mustChangePassword: (user as { mustChangePassword?: boolean }).mustChangePassword ?? false,
      profileComplete,
    },
  };
});
