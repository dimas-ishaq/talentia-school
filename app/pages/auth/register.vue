<script setup lang="ts">
import { registerSchema } from '~~/shared/schemas/auth'

definePageMeta({ layout: false })

interface RegisterForm { organizationName: string; username: string; email: string; password: string; confirmPassword: string; tos: boolean }
const formRegister = ref<RegisterForm>({ organizationName: '', username: '', email: '', password: '', confirmPassword: '', tos: false })
const errors = ref<Record<string, string>>({})
const isLoading = ref(false)
const showPassword = ref(false)
const serverError = ref('')

function validate() {
  errors.value = {}
  serverError.value = ''
  const result = registerSchema.safeParse(formRegister.value)
  if (!result.success) {
    result.error.issues.forEach(issue => { errors.value[issue.path[0] as string] = issue.message })
    return false
  }
  return true
}

async function handleSubmit() {
  if (!validate()) return
  isLoading.value = true
  try {
    await $fetch('/api/auth/register', { method: 'POST', body: formRegister.value })
    serverError.value = 'Pendaftaran diterima. Akun sekolah masih menunggu persetujuan operator — Anda belum bisa login. Hubungi operator.'
    return
  } catch (e: any) {
    const field = e.data?.data?.field
    const message = e.data?.statusMessage ?? 'Registrasi gagal. Coba lagi.'
    if (field) errors.value[field] = message
    else serverError.value = message
  } finally { isLoading.value = false }
}

Object.keys(formRegister.value).forEach(key =>
  watch(() => formRegister.value[key as keyof RegisterForm], () => { delete errors.value[key]; serverError.value = '' })
)
</script>

<template>
  <div class="min-h-dvh bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
    <div class="absolute right-4 top-4">
      <ThemeToggle />
    </div>

    <main class="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-6 py-16">
      <header class="mb-10">
        <NuxtLink to="/" class="mb-6 inline-flex items-center gap-2">
          <span class="flex size-9 items-center justify-center rounded-xl bg-emerald-600 shadow-sm shadow-emerald-600/20">
            <Icon name="heroicons:academic-cap" class="size-4.5 text-white" />
          </span>
          <span class="whitespace-nowrap text-base font-bold tracking-tight text-slate-900 dark:text-white">Talentia School</span>
        </NuxtLink>
        <h1 class="text-2xl font-semibold tracking-tight">Daftar</h1>
        <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Buat akun baru untuk mulai menggunakan Talentia School.
        </p>
      </header>

      <form class="space-y-5" @submit.prevent="handleSubmit">
        <div>
          <label for="organizationName" class="mb-1.5 block text-sm font-medium">Nama sekolah</label>
          <input
            id="organizationName"
            v-model="formRegister.organizationName"
            type="text"
            autocomplete="organization"
            placeholder="SMA/SMK Contoh"
            :disabled="isLoading"
            class="w-full rounded-lg border bg-transparent px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 disabled:opacity-50 dark:focus:border-white dark:focus:ring-white/10"
            :class="errors.organizationName ? 'border-red-400' : 'border-slate-300 dark:border-slate-700'"
          >
          <p v-if="errors.organizationName" class="mt-1.5 text-xs text-red-600 dark:text-red-400">{{ errors.organizationName }}</p>
        </div>

        <div>
          <label for="username" class="mb-1.5 block text-sm font-medium">Username admin</label>
          <input
            id="username"
            v-model="formRegister.username"
            type="text"
            autocomplete="username"
            placeholder="namaanda"
            :disabled="isLoading"
            class="w-full rounded-lg border bg-transparent px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 disabled:opacity-50 dark:focus:border-white dark:focus:ring-white/10"
            :class="errors.username ? 'border-red-400' : 'border-slate-300 dark:border-slate-700'"
          >
          <p v-if="errors.username" class="mt-1.5 text-xs text-red-600 dark:text-red-400">{{ errors.username }}</p>
        </div>

        <div>
          <label for="email" class="mb-1.5 block text-sm font-medium">Email</label>
          <input
            id="email"
            v-model="formRegister.email"
            type="email"
            autocomplete="email"
            placeholder="nama@email.com"
            :disabled="isLoading"
            class="w-full rounded-lg border bg-transparent px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 disabled:opacity-50 dark:focus:border-white dark:focus:ring-white/10"
            :class="errors.email ? 'border-red-400' : 'border-slate-300 dark:border-slate-700'"
          >
          <p v-if="errors.email" class="mt-1.5 text-xs text-red-600 dark:text-red-400">{{ errors.email }}</p>
        </div>

        <div>
          <label for="password" class="mb-1.5 block text-sm font-medium">Password</label>
          <div class="relative">
            <input
              id="password"
              v-model="formRegister.password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="new-password"
              placeholder="Minimal 8 karakter"
              :disabled="isLoading"
              class="w-full rounded-lg border bg-transparent px-3.5 py-2.5 pr-11 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 disabled:opacity-50 dark:focus:border-white dark:focus:ring-white/10"
              :class="errors.password ? 'border-red-400' : 'border-slate-300 dark:border-slate-700'"
            >
            <button
              type="button"
              class="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 transition hover:text-slate-700 dark:hover:text-slate-200"
              :aria-label="showPassword ? 'Sembunyikan password' : 'Tampilkan password'"
              @click="showPassword = !showPassword"
            >
              <Icon :name="showPassword ? 'heroicons:eye-slash' : 'heroicons:eye'" class="size-4" />
            </button>
          </div>
          <p v-if="errors.password" class="mt-1.5 text-xs text-red-600 dark:text-red-400">{{ errors.password }}</p>
        </div>

        <div>
          <label for="confirmPassword" class="mb-1.5 block text-sm font-medium">Konfirmasi password</label>
          <input
            id="confirmPassword"
            v-model="formRegister.confirmPassword"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="new-password"
            placeholder="Ulangi password"
            :disabled="isLoading"
            class="w-full rounded-lg border bg-transparent px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 disabled:opacity-50 dark:focus:border-white dark:focus:ring-white/10"
            :class="errors.confirmPassword ? 'border-red-400' : 'border-slate-300 dark:border-slate-700'"
          >
          <p v-if="errors.confirmPassword" class="mt-1.5 text-xs text-red-600 dark:text-red-400">{{ errors.confirmPassword }}</p>
        </div>

        <label class="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-400">
          <input
            v-model="formRegister.tos"
            type="checkbox"
            :disabled="isLoading"
            class="mt-0.5 size-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900/20 dark:border-slate-600 dark:text-white"
          >
          <span>
            Saya setuju dengan <NuxtLink to="/terms" class="font-medium text-slate-900 underline-offset-4 hover:underline dark:text-white">Syarat dan Ketentuan</NuxtLink>
            dan <NuxtLink to="/privacy" class="font-medium text-slate-900 underline-offset-4 hover:underline dark:text-white">Kebijakan Privasi</NuxtLink>.
          </span>
        </label>
        <p v-if="errors.tos" class="-mt-3 text-xs text-red-600 dark:text-red-400">{{ errors.tos }}</p>

        <p v-if="serverError" class="text-sm text-red-600 dark:text-red-400">{{ serverError }}</p>

        <button
          type="submit"
          :disabled="isLoading"
          class="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
        >
          <span v-if="isLoading" class="size-3.5 animate-spin rounded-full border-2 border-current/30 border-t-current" />
          {{ isLoading ? 'Memproses...' : 'Buat akun' }}
        </button>
      </form>

      <p class="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        Sudah punya akun?
        <NuxtLink to="/auth/login" class="font-medium text-slate-900 underline-offset-4 hover:underline dark:text-white">Masuk</NuxtLink>
      </p>
    </main>
  </div>
</template>