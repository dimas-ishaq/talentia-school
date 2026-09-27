<script setup lang="ts">
const { data, pending } = await useFetch<{ data: { id: string; title: string; courseId: string; courseName: string; totalAttempts: number }[] }>('/api/quizzes-analysis-list')
const quizzes = computed(() => data.value?.data ?? [])
</script>

<template>
  <div class="mx-auto max-w-6xl space-y-5">
    <div><h1 class="text-2xl font-bold text-slate-800 dark:text-slate-100">Analisis Butir Soal</h1><p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Pilih ujian untuk melihat kualitas setiap butir soal.</p></div>
    <div v-if="pending" class="grid gap-4 sm:grid-cols-2"><div v-for="i in 4" :key="i" class="h-28 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-700" /></div>
    <div v-else-if="!quizzes.length" class="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800">Belum ada ujian yang dapat dianalisis.</div>
    <div v-else class="grid gap-4 sm:grid-cols-2">
      <NuxtLink v-for="quiz in quizzes" :key="quiz.id" :to="`/dashboard/courses/${quiz.courseId}/quizzes/${quiz.id}/analysis`" class="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-emerald-400 hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
        <div class="flex items-start justify-between gap-3"><h2 class="font-semibold text-slate-800 dark:text-slate-100">{{ quiz.title }}</h2><Icon name="heroicons:chart-bar-square" class="h-5 w-5 shrink-0 text-emerald-500" /></div>
        <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">{{ quiz.courseName }}</p>
        <p class="mt-4 text-xs text-slate-400">{{ quiz.totalAttempts }} percobaan tersimpan</p>
      </NuxtLink>
    </div>
  </div>
</template>
