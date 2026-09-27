<script setup lang="ts">
definePageMeta({ layout: false })
const route = useRoute()
const token = String(route.query.token || '')
const newPassword = ref('')
const error = ref('')
const done = ref(false)
async function submit() {
  error.value = ''
  try { await $fetch('/api/auth/reset-password', { method: 'POST', body: { token, newPassword: newPassword.value } }); done.value = true }
  catch (e: any) { error.value = e.data?.statusMessage || 'Gagal mereset password.' }
}
</script>
<template><main class="mx-auto flex min-h-dvh max-w-sm items-center px-6"><form class="w-full space-y-4" @submit.prevent="submit"><h1 class="text-2xl font-bold">Reset password</h1><p v-if="done" class="text-sm text-emerald-600">Password berhasil diubah.</p><NuxtLink v-if="done" to="/auth/login" class="block underline">Masuk</NuxtLink><template v-else><p v-if="error" class="text-sm text-red-600">{{ error }}</p><input v-model="newPassword" type="password" minlength="8" required placeholder="Password baru, minimal 8 karakter" class="field w-full"><button class="btn w-full">Simpan password</button></template></form></main></template>
