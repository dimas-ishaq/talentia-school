<script setup lang="ts">
definePageMeta({ layout: false, middleware: ['auth'] })
const form = reactive({ currentPassword: '', newPassword: '' })
const error = ref('')
const saving = ref(false)
async function submit() {
  error.value = ''; saving.value = true
  try {
    await $fetch('/api/auth/change-password', { method: 'POST', body: form })
    await navigateTo('/dashboard')
  } catch (e: any) { error.value = e?.data?.statusMessage || 'Gagal mengganti password.' }
  finally { saving.value = false }
}
</script>
<template>
  <main class="mx-auto flex min-h-dvh max-w-sm items-center px-6">
    <form class="w-full space-y-4" @submit.prevent="submit">
      <h1 class="text-2xl font-bold">Ganti password</h1>
      <p class="text-sm text-slate-500">Password sementara wajib diganti sebelum melanjutkan.</p>
      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
      <input v-model="form.currentPassword" type="password" required placeholder="Password saat ini" class="field w-full">
      <input v-model="form.newPassword" type="password" minlength="8" required placeholder="Password baru, minimal 8 karakter" class="field w-full">
      <button :disabled="saving" class="btn w-full">{{ saving ? 'Menyimpan...' : 'Simpan password' }}</button>
    </form>
  </main>
</template>
