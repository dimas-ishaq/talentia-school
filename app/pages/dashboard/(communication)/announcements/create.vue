<script setup lang="ts">
// Pembuatan pengumuman sekarang lewat modal di halaman daftar.
// Halaman ini hanya mengalihkan agar tautan lama tetap berfungsi.
definePageMeta({ layout: 'dashboard', middleware: ['auth', 'role'], roles: ['teacher', 'admin'] })
await navigateTo('/dashboard/announcements?create=1', { replace: true })
</script>

<template>
  <div />
</template>
