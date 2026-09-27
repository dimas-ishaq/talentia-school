// app/middleware/role.ts
export default defineNuxtRouteMiddleware((to) => {
  const { user } = useUserSession();

  if (!user.value) return;

  // Ambil role yang diizinkan dari meta halaman
  const allowedRoles = to.meta.roles as string[] | undefined;

  // Kalau tidak ada restriction, izinkan
  if (!allowedRoles || allowedRoles.length === 0) return;

  // Cek role user
  if (!allowedRoles.includes(user.value.role)) {
    // Redirect ke dashboard sesuai role-nya
    return navigateTo(`/dashboard/${user.value.role}`);
  }
});
