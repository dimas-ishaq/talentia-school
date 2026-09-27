<!-- app/pages/auth/login.vue -->
<script setup lang="ts">
import { loginSchema } from '~~/shared/schemas/auth'

definePageMeta({ layout: false })

const { loggedIn, fetch: refreshSession } = useUserSession()
if (loggedIn.value) await navigateTo('/dashboard')

const config = useRuntimeConfig()
const showDemoAccounts = computed(() => Boolean(config.public.showDemoAccounts))

const form = reactive({ email: '', password: '' })
const errors = ref<Record<string, string>>({})
const serverError = ref('')
const isLoading = ref(false)
const showPassword = ref(false)

const demoAccounts = [
  { label: 'Admin', email: 'admin@sekolah.com' },
  { label: 'Guru', email: 'guru@sekolah.com' },
  { label: 'Siswa', email: 'siswa@sekolah.com' },
  { label: 'Orang Tua', email: 'ortu@sekolah.com' },
]

function validate(): boolean {
  errors.value = {}
  serverError.value = ''
  const result = loginSchema.safeParse(form)
  if (!result.success) {
    for (const issue of result.error.issues) errors.value[issue.path[0] as string] = issue.message
    return false
  }
  return true
}

async function handleLogin() {
  if (!validate()) return
  isLoading.value = true
  try {
    await $fetch('/api/auth/login', { method: 'POST', body: { email: form.email.toLowerCase(), password: form.password } })
    await refreshSession()
    await navigateTo((useUserSession().user.value as any)?.mustChangePassword ? '/auth/change-password' : '/dashboard')
  } catch (e: any) {
    serverError.value = e.data?.statusMessage || e.data?.message || 'Login gagal. Coba lagi.'
  } finally { isLoading.value = false }
}

function fillDemo(email: string) {
  form.email = email
  form.password = 'password123'
  errors.value = {}
  serverError.value = ''
}

watch(() => form.email, () => { delete errors.value.email; serverError.value = '' })
watch(() => form.password, () => { delete errors.value.password; serverError.value = '' })
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
        <h1 class="text-2xl font-semibold tracking-tight">Masuk</h1>
        <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Masukkan email dan password untuk melanjutkan.
        </p>
      </header>

      <form class="space-y-5" @submit.prevent="handleLogin">
        <div>
          <label for="email" class="mb-1.5 block text-sm font-medium">Email</label>
          <input
            id="email"
            v-model="form.email"
            type="email"
            autocomplete="email"
            placeholder="nama@sekolah.com"
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
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              placeholder="••••••••"
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

        <p v-if="serverError" class="text-sm text-red-600 dark:text-red-400">{{ serverError }}</p>

        <button
          type="submit"
          :disabled="isLoading"
          class="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
        >
          <span v-if="isLoading" class="size-3.5 animate-spin rounded-full border-2 border-current/30 border-t-current" />
          {{ isLoading ? 'Memproses...' : 'Masuk' }}
        </button>
      </form>

      <NuxtLink to="/auth/forgot-password" class="mt-5 block text-center text-sm text-slate-500 underline dark:text-slate-400">Lupa password?</NuxtLink>

      <p class="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        Belum punya akun?
        <NuxtLink to="/auth/register" class="font-medium text-slate-900 underline-offset-4 hover:underline dark:text-white">Daftar</NuxtLink>
      </p>

      <section v-if="showDemoAccounts" class="mt-10 border-t border-slate-200 pt-6 dark:border-slate-800">
        <p class="mb-3 text-xs text-slate-400">
          Akun demo · password <span class="font-mono text-slate-500 dark:text-slate-400">password123</span>
        </p>
        <div class="grid grid-cols-2 gap-2">
          <button
            v-for="acc in demoAccounts"
            :key="acc.email"
            type="button"
            class="rounded-lg border border-slate-200 px-3 py-2 text-left text-xs font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-white"
            @click="fillDemo(acc.email)"
          >
            {{ acc.label }}
          </button>
        </div>
      </section>
    </main>
  </div>
</template>
