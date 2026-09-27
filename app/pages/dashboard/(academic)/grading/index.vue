<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: ['auth', 'role'], roles: ['teacher', 'admin'] })

const { data: allCourses, pending } = await useFetch<{ data: any[] }>(() => '/api/courses', { key: 'grading-courses-all' })
const courses = computed(() => allCourses.value?.data ?? [])
</script>

<template>
  <div class="space-y-5">
    <header>
      <h1 class="text-xl font-bold text-slate-800 dark:text-slate-100">Koreksi Tugas</h1>
      <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Pilih course untuk mengoreksi submission (assignment & forum) yang belum dinilai.</p>
    </header>

    <div v-if="pending" class="h-40 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-700" />
    <div v-else-if="courses.length === 0" class="rounded-xl border border-slate-200 bg-white p-8 dark:border-slate-700 dark:bg-slate-800">
      <p class="text-center text-sm text-slate-500 dark:text-slate-400">Belum ada course.</p>
    </div>
    <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <NuxtLink
        v-for="c in courses"
        :key="c.id"
        :to="`/dashboard/courses/${c.id}/grading`"
        class="group overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:border-emerald-400 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-emerald-600"
      >
        <div class="p-4">
          <h3 class="font-semibold text-slate-800 dark:text-slate-100">{{ c.name }}</h3>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{{ c.description || 'Tidak ada deskripsi.' }}</p>
        </div>
        <div class="flex items-center justify-between border-t border-slate-100 bg-amber-50/50 px-4 py-2 dark:border-slate-700/50 dark:bg-amber-900/10">
          <span class="text-xs font-medium text-amber-600 dark:text-amber-400">Koreksi submission</span>
          <Icon name="heroicons:arrow-right" class="h-4 w-4 text-amber-500 opacity-0 group-hover:opacity-100" />
        </div>
      </NuxtLink>
    </div>
  </div>
</template>
