<script setup lang="ts">
defineProps<{ title: string; description?: string }>()
</script>

<template>
  <div class="rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-800">
    <Icon name="heroicons:rectangle-stack" class="mx-auto h-10 w-10 text-emerald-500" />
    <h1 class="mt-3 text-xl font-bold text-slate-800 dark:text-slate-100">{{ title }}</h1>
    <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">{{ description || 'Fitur siap digunakan setelah data tersedia.' }}</p>
    <NuxtLink to="/dashboard/courses" class="mt-5 inline-flex rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600">Buka Course</NuxtLink>
  </div>
</template>
