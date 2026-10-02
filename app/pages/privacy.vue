<script setup lang="ts">
definePageMeta({ layout: false })
useHead({ title: 'Kebijakan Privasi — Talentia School' })
</script>

<template>
  <div class="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
    <div class="mx-auto max-w-3xl px-6 py-12">
      <NuxtLink to="/" class="text-sm text-emerald-600 hover:underline">← Kembali ke beranda</NuxtLink>
      <h1 class="mt-6 text-3xl font-bold tracking-tight">Kebijakan Privasi</h1>
      <p class="mt-2 text-sm text-slate-500">Terakhir diperbarui: Oktober 2026 — Pilot terkelola.</p>
      <div class="prose prose-slate mt-8 max-w-none dark:prose-invert">
        <p>Talentia School memproses data pribadi (nama, email, NIS, data kehadiran/nilai) hanya untuk operasional pembelajaran sekolah yang bersangkutan. Data satu sekolah tidak dibagikan ke sekolah lain.</p>
        <h2>Penyimpanan & retensi</h2>
        <p>Data tersimpan di database yang dikelola operator. Retensi mengikuti kebutuhan operasional dan permintaan resmi penghapusan data dari sekolah.</p>
        <h2>Hak subjek data</h2>
        <p>Pengguna dapat meminta akses, koreksi, atau penghapusan data melalui admin sekolah / operator.</p>
        <p class="text-sm text-slate-500">Dokumen ini adalah stub pilot; kebijakan definitif akan menyusul sebelum peluncuran berbayar.</p>
      </div>
    </div>
  </div>
</template>
