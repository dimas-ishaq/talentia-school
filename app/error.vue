<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{
  error: NuxtError
}>()

const is404 = computed(() => props.error?.status === 404)

const title = computed(() =>
  is404.value ? '404 - Halaman Tidak Ditemukan' : 'Terjadi Kesalahan'
)

const message = computed(() =>
  is404.value
    ? 'Maaf, halaman yang Anda cari tidak ada atau sudah dipindahkan.'
    : props.error?.statusText || 'Ada yang tidak beres. Silakan coba lagi.'
)

function handleError() {
  clearError({ redirect: '/' })
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 px-4">
    <div class="max-w-md w-full text-center">
      <!-- Angka Error -->
      <h1 class="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">
        {{ error.status }}
      </h1>

      <!-- Judul -->
      <h2 class="mt-6 text-2xl font-bold text-slate-800 dark:text-slate-100">
        {{ title }}
      </h2>

      <!-- Pesan -->
      <p class="mt-3 text-slate-500 dark:text-slate-400 leading-relaxed">
        {{ message }}
      </p>

      <!-- Tombol Aksi -->
      <div class="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
        <button
          class="px-6 py-3 rounded-lg bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/30"
          @click="handleError"
        >
          Kembali ke Beranda
        </button>
        <NuxtLink
          to="/"
          class="px-6 py-3 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          Refresh Halaman
        </NuxtLink>
      </div>

      <!-- Detail Error (hanya di development) -->
      <details
        v-if="$config.public.dev && !is404"
        class="mt-8 text-left text-sm text-slate-400"
      >
        <summary class="cursor-pointer hover:text-slate-600">Detail Error</summary>
        <pre class="mt-2 p-4 bg-slate-900 text-slate-100 rounded-lg overflow-auto text-xs">{{ error }}</pre>
      </details>
    </div>
  </div>
</template>