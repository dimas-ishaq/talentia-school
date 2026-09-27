<script setup lang="ts">
import type { ActivityNavItem } from '~/composables/useActivityNavigation'

const props = defineProps<{
  previous?: ActivityNavItem | null
  next?: ActivityNavItem | null
  link?: (item: ActivityNavItem | null) => any
}>()

const fallbacks: Record<string, string> = {
  text: 'Materi',
  file: 'File',
  video: 'Video',
  link: 'Link',
  presentation: 'Presentasi',
  quiz: 'Quiz',
  forum: 'Forum',
  assignment: 'Tugas',
  exam: 'Ujian',
}

function label(item: ActivityNavItem) {
  return `${fallbacks[item.type] ?? 'Materi'} — ${item.title}`
}

const to = (item: ActivityNavItem | null | undefined) => (props.link ? props.link(item ?? null) : item?.path)
</script>

<template>
  <nav class="flex flex-wrap items-center gap-2" aria-label="Navigasi materi">
    <NuxtLink
      v-if="props.previous"
      :to="to(props.previous)"
      class="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
    >
      <Icon name="heroicons:chevron-left" class="h-4 w-4" />
      Materi sebelumnya
    </NuxtLink>
    <span
      v-else
      class="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-400 dark:border-slate-600 dark:bg-slate-700/40 dark:text-slate-500"
    >
      <Icon name="heroicons:chevron-left" class="h-4 w-4" />
      Materi pertama
    </span>

    <NuxtLink
      v-if="props.next"
      :to="to(props.next)"
      class="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
    >
      Materi selanjutnya
      <Icon name="heroicons:chevron-right" class="h-4 w-4" />
    </NuxtLink>
    <span
      v-else
      class="ml-auto inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-400 dark:border-slate-600 dark:bg-slate-700/40 dark:text-slate-500"
    >
      Materi terakhir
      <Icon name="heroicons:chevron-right" class="h-4 w-4" />
    </span>
  </nav>

  <p v-if="props.previous || props.next" class="text-xs text-slate-500 dark:text-slate-400">
    <span v-if="props.previous">Sebelumnya: {{ label(props.previous) }}</span>
    <span v-if="props.previous && props.next"> · </span>
    <span v-if="props.next">Selanjutnya: {{ label(props.next) }}</span>
  </p>
</template>
