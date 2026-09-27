declare module '#auth-utils' {
  interface User {
    id: string
    organizationId: string
    email: string
    name: string
    role: 'admin' | 'org_admin' | 'owner' | 'teacher' | 'student' | 'parent'
    platformRole?: 'platform_owner' | 'platform_admin' | 'platform_support' | null
    profileComplete?: boolean
  }

  interface SecureSessionData {
    // contoh: refreshToken: string
  }
}

export {}
