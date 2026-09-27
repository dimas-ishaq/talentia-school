<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: ['auth'] })
</script>

<template>
  <div class="mx-auto max-w-6xl space-y-5">
    <NuxtLink :to="`/dashboard/courses/${$route.params.id}`" class="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-indigo-600"><Icon name="heroicons:arrow-left" class="h-4 w-4" /> Kembali ke Course</NuxtLink>
    <CourseLogbookView :course-id="String($route.params.id)" />
  </div>
</template>
