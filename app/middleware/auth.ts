// app/middleware/auth.ts
export default defineNuxtRouteMiddleware(() => {
  const { loggedIn } = useUserSession()

  // Belum login → redirect ke login
  if (!loggedIn.value) {
    return navigateTo('/auth/login')
  }
})