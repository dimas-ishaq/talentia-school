<script setup lang="ts">
definePageMeta({ layout: false })
const email = ref('')
const message = ref('')
const error = ref('')
const loading = ref(false)
async function submit() {
  loading.value = true; error.value = ''; message.value = ''
  try { const result = await $fetch<{ message: string }>('/api/auth/forgot-password', { method: 'POST', body: { email: email.value } }); message.value = result.message }
  catch (e: any) { error.value = e.data?.statusMessage || 'Gagal mengirim link reset.' }
  finally { loading.value = false }
}
</script>
<template><main class="mx-auto flex min-h-dvh max-w-sm items-center px-6"><form class="w-full space-y-4" @submit.prevent="submit"><h1 class="text-2xl font-bold">Lupa password</h1><p class="text-sm text-slate-500">Masukkan email akun untuk menerima link reset.</p><p v-if="message" class="text-sm text-emerald-600">{{ message }}</p><p v-if="error" class="text-sm text-red-600">{{ error }}</p><input v-model="email" type="email" required placeholder="Email" class="field w-full"><button :disabled="loading" class="btn w-full">{{ loading ? 'Mengirim...' : 'Kirim link reset' }}</button><NuxtLink to="/auth/login" class="block text-center text-sm underline">Kembali ke login</NuxtLink></form></main></template>
