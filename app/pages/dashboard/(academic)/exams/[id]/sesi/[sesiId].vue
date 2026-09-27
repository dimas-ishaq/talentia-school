<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any -- monitoring response contains polymorphic attempt rows. */
definePageMeta({ layout: 'dashboard', middleware: ['auth', 'role'], roles: ['admin'] })
const route = useRoute()
const eventId = computed(() => String(route.params.id)); const sesiId = computed(() => String(route.params.sesiId))
const { data, pending, refresh } = await useFetch<any>(() => `/api/exam-events/${eventId.value}/sesi/${sesiId.value}/monitor`)
const rows = computed(() => data.value?.data?.attempts ?? [])
const statusLabel: Record<string, string> = { in_progress: 'Mengerjakan', submitted: 'Selesai', auto_submitted: 'Waktu habis', needs_grading: 'Perlu koreksi', abandoned: 'Ditinggalkan' }
const statusTone: Record<string, string> = {
  in_progress: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-300',
  submitted: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300',
  auto_submitted: 'bg-amber-50 text-amber-600 dark:bg-amber-400/10 dark:text-amber-300',
  needs_grading: 'bg-violet-50 text-violet-600 dark:bg-violet-400/10 dark:text-violet-300',
  abandoned: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
}
async function unlock(id: string) { await $fetch(`/api/exam-events/${eventId.value}/sesi/${sesiId.value}/unlock`, { method: 'POST', body: { attemptId: id } }); await refresh() }
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => { timer = setInterval(() => void refresh(), 30000) })
onBeforeUnmount(() => clearInterval(timer))

const stats = computed(() => [
  { label: 'Peserta', value: rows.value.length, icon: 'heroicons:users', tone: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-400/10 dark:text-emerald-300' },
  { label: 'Mengerjakan', value: rows.value.filter((r: any) => r.status === 'in_progress').length, icon: 'heroicons:pencil-square', tone: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-400/10 dark:text-indigo-300' },
  { label: 'Selesai', value: rows.value.filter((r: any) => r.status === 'submitted').length, icon: 'heroicons:check-badge', tone: 'text-violet-600 bg-violet-50 dark:bg-violet-400/10 dark:text-violet-300' },
  { label: 'Terkunci', value: rows.value.filter((r: any) => r.lockStatus === 'locked').length, icon: 'heroicons:lock-closed', tone: 'text-rose-600 bg-rose-50 dark:bg-rose-400/10 dark:text-rose-300' },
])
</script>

<template>
  <div class="mx-auto max-w-6xl space-y-6 pb-8">
    <NuxtLink :to="`/dashboard/exams/${eventId}`" class="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
      <Icon name="heroicons:arrow-left" class="h-4 w-4" /> Kembali ke event
    </NuxtLink>

    <!-- ============ HEADER ============ -->
    <section class="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-8">
      <div class="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />
      <div class="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div class="max-w-xl">
          <div class="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-400/10 dark:text-emerald-300">
            <Icon name="heroicons:eye" class="h-4 w-4" /> Monitoring
          </div>
          <h1 class="mt-4 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Monitoring Sesi</h1>
          <p class="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{{ data?.data?.sesi?.name }} · refresh otomatis tiap 30 detik</p>
        </div>
        <button class="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700" @click="refresh()">
          <Icon name="heroicons:arrow-path" class="h-4 w-4" /> Muat ulang
        </button>
      </div>

      <div class="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div v-for="stat in stats" :key="stat.label" class="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-700 dark:bg-slate-900/30">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-slate-500 dark:text-slate-400">{{ stat.label }}</span>
            <span class="flex h-8 w-8 items-center justify-center rounded-lg" :class="stat.tone">
              <Icon :name="stat.icon" class="h-4 w-4" />
            </span>
          </div>
          <p class="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{{ stat.value }}</p>
        </div>
      </div>
    </section>

    <!-- Loading -->
    <div v-if="pending" class="h-40 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-700/50" />

    <!-- Empty -->
    <div v-else-if="!rows.length" class="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-600 dark:bg-slate-800">
      <Icon name="heroicons:users" class="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
      <p class="mt-3 text-sm text-slate-500 dark:text-slate-400">Belum ada siswa memulai ujian.</p>
    </div>

    <!-- Tabel -->
    <div v-else class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="border-b border-slate-200 bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-700/30">
            <tr>
              <th class="px-4 py-3 font-medium">Siswa</th>
              <th class="px-4 py-3 font-medium">Kelas</th>
              <th class="px-4 py-3 font-medium">Mapel</th>
              <th class="px-4 py-3 font-medium">Status</th>
              <th class="px-4 py-3 font-medium">Pelanggaran</th>
              <th class="px-4 py-3 font-medium">Nilai</th>
              <th class="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in rows" :key="r.id" class="border-t border-slate-100 transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/40">
              <td class="px-4 py-3">
                <span class="font-medium text-slate-800 dark:text-slate-100">{{ r.studentName }}</span>
                <small class="block text-xs text-slate-400">{{ r.nis }}</small>
              </td>
              <td class="px-4 py-3 text-slate-600 dark:text-slate-300">{{ r.className }}</td>
              <td class="px-4 py-3 text-slate-600 dark:text-slate-300">{{ r.subjectName }}</td>
              <td class="px-4 py-3">
                <span class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold" :class="statusTone[r.status] || statusTone.abandoned">
                  <span class="h-1.5 w-1.5 rounded-full bg-current" />{{ statusLabel[r.status] || r.status }}
                </span>
                <span v-if="r.lockStatus === 'locked'" class="ml-1 inline-flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400">
                  <Icon name="heroicons:lock-closed" class="h-3.5 w-3.5" /> Terkunci
                </span>
              </td>
              <td class="px-4 py-3">
                <span class="inline-flex items-center gap-1 font-semibold" :class="r.violationCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'">
                  <Icon name="heroicons:exclamation-triangle" class="h-3.5 w-3.5" /> {{ r.violationCount }}
                </span>
              </td>
              <td class="px-4 py-3 font-bold text-slate-800 dark:text-slate-100">{{ r.score ?? '-' }}</td>
              <td class="px-4 py-3 text-right">
                <button v-if="r.lockStatus === 'locked'" class="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600" @click="unlock(r.id)">
                  <Icon name="heroicons:lock-open" class="h-4 w-4" /> Buka
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
