<script setup lang="ts">
withDefaults(defineProps<{
  backTo?: string | Record<string, any>
  backLabel?: string
  items?: { label: string; to?: string | Record<string, any> }[]
}>(), {
  backLabel: 'Kembali',
  items: () => [],
})
</script>

<template>
  <nav aria-label="Breadcrumb" class="flex flex-wrap items-center gap-3">
    <NuxtLink
      v-if="backTo"
      :to="backTo"
      class="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
    >
      <Icon name="heroicons:arrow-left" class="h-5 w-5 shrink-0" />
      {{ backLabel }}
    </NuxtLink>
    <ol v-if="items.length" class="flex min-w-0 flex-wrap items-center gap-1.5 text-sm">
      <li v-for="(item, idx) in items" :key="idx" class="flex items-center gap-1.5">
        <Icon v-if="idx > 0" name="heroicons:chevron-right" class="h-3.5 w-3.5 shrink-0 text-slate-400" />
        <NuxtLink v-if="item.to" :to="item.to" class="max-w-[14rem] truncate font-medium text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400">
          {{ item.label }}
        </NuxtLink>
        <span v-else class="max-w-[14rem] truncate font-semibold text-slate-800 dark:text-slate-100">{{ item.label }}</span>
      </li>
    </ol>
  </nav>
</template>
