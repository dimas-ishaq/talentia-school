<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: ['auth'], roles: ['student'] })

const { data, pending, error, refresh } = await useFetch<{ data: any[] }>('/api/assignments', { key: 'student-assignments' })
const rows = computed(() => (data.value?.data ?? []).filter((a) => a.submittedAt))
const labels: Record<string, string> = { submitted: 'Menunggu nilai', returned: 'Perlu revisi', graded: 'Sudah dinilai' }
</script>

<template>
  <div class="mx-auto max-w-6xl space-y-5">
    <header class="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
      <h1 class="text-2xl font-bold text-slate-800 dark:text-slate-100">Tugas Terkumpul</h1>
      <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Riwayat pengumpulan tugas Anda.</p>
    </header>
    <div v-if="error" class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">Gagal memuat. <button class="underline" @click="refresh()">Coba lagi</button></div>
    <div v-else-if="pending" class="h-40 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-700" />
    <div v-else-if="!rows.length" class="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800">Belum ada tugas yang dikumpulkan.</div>
    <div v-else class="grid gap-3 md:grid-cols-2">
      <NuxtLink v-for="item in rows" :key="item.id" :to="`/dashboard/courses/${item.courseId}/activity/${item.id}`" class="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-emerald-400 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div class="flex items-start gap-3">
          <div class="min-w-0 flex-1"><p class="text-xs text-slate-400">{{ item.courseName }} · {{ item.sectionTitle }}</p><h2 class="mt-1 truncate font-bold text-slate-800 dark:text-slate-100">{{ item.title }}</h2></div>
          <span class="shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold" :class="item.status === 'returned' ? 'bg-orange-100 text-orange-700' : item.status === 'graded' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'">{{ labels[item.status] ?? item.status }}</span>
        </div>
        <p class="mt-3 text-xs text-slate-500">Dikumpulkan {{ new Date(item.submittedAt).toLocaleString('id-ID') }}<span v-if="item.isLate" class="ml-2 font-semibold text-amber-600">· Terlambat</span></p>
        <p v-if="item.score != null" class="mt-2 text-sm font-semibold text-emerald-600">Nilai: {{ item.score }}</p>
        <p v-if="item.returnReason" class="mt-2 truncate text-xs text-orange-600">Revisi: {{ item.returnReason }}</p>
      </NuxtLink>
    </div>
  </div>
</template>
