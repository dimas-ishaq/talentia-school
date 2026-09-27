// server/api/auth/me.get.ts
import { isProfileComplete } from '~~/server/utils/profile'
import type { User } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const profileComplete = await isProfileComplete(user as User)
  return { user: { ...user, mustChangePassword: (user as any).mustChangePassword ?? false }, profileComplete }
})