<!-- app/components/dashboard/ParentDashboard.vue -->
<script setup lang="ts">
const { user } = useAuth()
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-start justify-between">
      <div>
        <h1 class="text-2xl font-bold text-slate-800 dark:text-slate-100">Hai, {{ user?.name }}</h1>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Pantau aktivitas belajar anak Anda di sini.</p>
      </div>
      <span class="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">Orang Tua</span>
    </div>

    <div class="rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-800">
      <Icon name="heroicons:users" class="mx-auto h-10 w-10 text-emerald-500" />
      <h2 class="mt-3 text-lg font-bold text-slate-800 dark:text-slate-100">Data Anak Belum Terhubung</h2>
      <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">Hubungkan akun orang tua dengan data siswa melalui menu Pengguna di pengaturan admin.</p>
      <NuxtLink to="/dashboard/courses" class="mt-5 inline-flex rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600">Lihat Course</NuxtLink>
    </div>
  </div>
</template>