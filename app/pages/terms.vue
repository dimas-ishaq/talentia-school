<script setup lang="ts">
definePageMeta({ layout: false })
useHead({ title: 'Syarat Layanan — Talentia School' })
</script>

<template>
  <div class="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
    <div class="mx-auto max-w-3xl px-6 py-12">
      <NuxtLink to="/" class="text-sm text-emerald-600 hover:underline">← Kembali ke beranda</NuxtLink>
      <h1 class="mt-6 text-3xl font-bold tracking-tight">Syarat Layanan</h1>
      <p class="mt-2 text-sm text-slate-500">Terakhir diperbarui: Oktober 2026 — Pilot terkelola.</p>
      <div class="prose prose-slate mt-8 max-w-none dark:prose-invert">
        <p>Pilot Talentia School dijalankan sebagai layanan terkelola (managed pilot). Penagihan per-siswa aktif per bulan, dihitung dari snapshot jumlah siswa dengan <code>is_active = true</code> pada akhir bulan. Invoice dikirim manual oleh operator di luar aplikasi.</p>
        <h2>Penyediaan layanan</h2>
        <p>Status organisasi (<code>trial</code> / <code>active</code> / <code>suspended</code> / <code>cancelled</code>) dikelola manual oleh operator. Akses dapat dibatasi bila status <code>suspended</code> atau <code>cancelled</code>.</p>
        <h2>Tanggung jawab pengguna</h2>
        <p>Admin sekolah bertanggung jawab atas kebenaran data siswa/guru dan kerahasiaan akun. Penyalahgunaan akan ditindak sesuai kebijakan operator.</p>
        <h2>Kontak</h2>
        <p>Pertanyaan terkait layanan: hubungi operator melalui kontak yang tertera di halaman utama.</p>
        <p class="text-sm text-slate-500">Dokumen ini adalah stub pilot; perjanjian definitif akan menyusul sebelum peluncuran berbayar.</p>
      </div>
    </div>
  </div>
</template>
