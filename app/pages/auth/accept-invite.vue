<script setup lang="ts">
definePageMeta({ layout: false })

const route = useRoute()
const token = String(route.query.token || '')
const form = reactive({ name: '', password: '', confirmPassword: '' })
const error = ref('')
const done = ref(false)
const loading = ref(false)

async function submit() {
  error.value = ''
  if (!token) { error.value = 'Token undangan tidak ditemukan'; return }
  if (form.password !== form.confirmPassword) { error.value = 'Password tidak sama'; return }
  loading.value = true
  try {
    await $fetch('/api/organizations/invites/accept', { method: 'POST', body: { token, name: form.name, password: form.password } })
    done.value = true
  } catch (e: any) {
    error.value = e.data?.statusMessage || 'Undangan tidak dapat digunakan'
  } finally { loading.value = false }
}
</script>

<template>
  <main class="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-6 py-16 text-slate-900 dark:bg-slate-950 dark:text-white">
    <template v-if="done">
      <h1 class="text-2xl font-semibold">Akun berhasil dibuat</h1>
      <p class="mt-2 text-sm text-slate-500">Silakan masuk menggunakan email undangan.</p>
      <NuxtLink to="/auth/login" class="mt-6 rounded-lg bg-emerald-600 px-4 py-2.5 text-center text-sm font-medium text-white">Masuk</NuxtLink>
    </template>
    <template v-else>
      <h1 class="text-2xl font-semibold">Terima undangan</h1>
      <p class="mt-2 text-sm text-slate-500">Lengkapi akun organisasi Anda.</p>
      <form class="mt-8 space-y-4" @submit.prevent="submit">
        <input v-model="form.name" required minlength="2" placeholder="Nama lengkap" class="w-full rounded-lg border px-3.5 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900">
        <input v-model="form.password" required minlength="8" type="password" placeholder="Password minimal 8 karakter" class="w-full rounded-lg border px-3.5 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900">
        <input v-model="form.confirmPassword" required minlength="8" type="password" placeholder="Ulangi password" class="w-full rounded-lg border px-3.5 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900">
        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
        <button :disabled="loading" class="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">{{ loading ? 'Memproses...' : 'Buat akun' }}</button>
      </form>
    </template>
  </main>
</template>
