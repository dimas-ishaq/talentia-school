// app/composables/useAuth.ts
export interface AuthUser {
  id: string
  name: string
  email: string
  organizationId?: string
  role: 'admin' | 'owner' | 'org_admin' | 'teacher' | 'student' | 'parent'
  platformRole?: 'platform_owner' | 'platform_admin' | 'platform_support' | null
  profileComplete?: boolean
  mustChangePassword?: boolean
}

export function useAuth() {
  const {
    user: sessionUser,
    loggedIn,
    fetch: fetchSession,
    clear,
  } = useUserSession()

  // Cast ke tipe kita
  const user = computed<AuthUser | null>(() => {
    if (!sessionUser.value) return null
    return sessionUser.value as AuthUser
  })

  // Role helpers ('admin' legacy = admin sekolah; 'org_admin'/'owner' = admin sekolah baru)
  const isAdmin = computed(() => ['admin', 'org_admin', 'owner'].includes(user.value?.role ?? ''))
  const isOwner = computed(() => ['owner', 'platform_owner'].includes(user.value?.role ?? '') || ['platform_owner', 'platform_admin'].includes(user.value?.platformRole ?? ''))
  const isTeacher = computed(() => user.value?.role === 'teacher')
  const isStudent = computed(() => user.value?.role === 'student')
  const isParent = computed(() => user.value?.role === 'parent')

  // Cek multiple roles
  function hasRole(roles: string[]) {
    return computed(() => roles.includes(user.value?.role ?? ''))
  }

  // Login
  async function login(email: string, password: string) {
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    })
    await fetchSession()
    await navigateTo('/dashboard')
  }

  // Logout
  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' })
    await clear()
    await navigateTo('/auth/login')
  }

  return {
    // State
    user,
    loggedIn,
    fetchSession,

    // Role helpers
    isAdmin,
    isOwner,
    isTeacher,
    isStudent,
    isParent,
    hasRole,

    // Actions
    login,
    logout,
  }
}