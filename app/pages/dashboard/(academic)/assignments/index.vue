<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: ['auth'], roles: ['student'] })

const { data, pending, error, refresh } = await useFetch<{ data: any[] }>('/api/assignments', { key: 'student-assignments' })
const assignments = computed(() => data.value?.data ?? [])
const filter = ref('all')
const filtered = computed(() => filter.value === 'all' ? assignments.value : assignments.value.filter((a) => a.status === filter.value))
const counts = computed(() => Object.fromEntries(['pending', 'overdue', 'submitted', 'returned', 'graded'].map((s) => [s, assignments.value.filter((a) => a.status === s).length])))
const labels: Record<string, string> = { pending: 'Belum dikerjakan', overdue: 'Terlambat', submitted: 'Menunggu nilai', returned: 'Perlu revisi', graded: 'Sudah dinilai' }
</script>

<template>
  <div class="mx-auto max-w-6xl space-y-5">
    <header class="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
      <h1 class="text-2xl font-bold text-slate-800 dark:text-slate-100">Tugas Aktif</h1>
      <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Semua tugas dari course yang diikuti.</p>
    </header>
    <div v-if="error" class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">Gagal memuat tugas. <button class="underline" @click="refresh()">Coba lagi</button></div>
    <div v-else class="space-y-4">
      <div class="flex flex-wrap gap-2">
        <button class="rounded-full px-3 py-1.5 text-xs font-semibold" :class="filter === 'all' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'" @click="filter = 'all'">Semua ({{ assignments.length }})</button>
        <button v-for="status in ['pending', 'overdue', 'submitted', 'returned', 'graded']" :key="status" class="rounded-full px-3 py-1.5 text-xs font-semibold" :class="filter === status ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'" @click="filter = status">{{ labels[status] }} ({{ counts[status] ?? 0 }})</button>
      </div>
      <div v-if="pending" class="h-40 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-700" />
      <div v-else-if="!filtered.length" class="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800">Tidak ada tugas pada filter ini.</div>
      <div v-else class="grid gap-3 md:grid-cols-2">
        <NuxtLink v-for="item in filtered" :key="item.id" :to="`/dashboard/courses/${item.courseId}/activity/${item.id}`" class="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-emerald-400 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div class="flex items-start gap-3">
            <div class="min-w-0 flex-1"><p class="text-xs text-slate-400">{{ item.courseName }} · {{ item.sectionTitle }}</p><h2 class="mt-1 truncate font-bold text-slate-800 dark:text-slate-100">{{ item.title }}</h2></div>
            <span class="shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold" :class="item.status === 'returned' ? 'bg-orange-100 text-orange-700' : item.status === 'overdue' ? 'bg-red-100 text-red-700' : item.status === 'graded' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'">{{ labels[item.status] }}</span>
          </div>
          <p class="mt-3 text-xs text-slate-500">{{ item.dueDate ? `Tenggat ${new Date(item.dueDate).toLocaleString('id-ID')}` : 'Tanpa tenggat' }}<span v-if="item.isLate" class="ml-2 font-semibold text-amber-600">· Terlambat</span></p>
          <p v-if="item.scorePublishedAt && item.score != null" class="mt-2 text-sm font-semibold text-emerald-600">Nilai: {{ item.score }}</p>
          <p v-if="item.returnReason" class="mt-2 truncate text-xs text-orange-600">Revisi: {{ item.returnReason }}</p>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
