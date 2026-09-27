<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any -- student session API payload. */
import { formatJakartaDateTime } from '~/utils/datetime'

const { data, pending } = await useFetch<any>('/api/student/exam-sessions')
const sessions = computed(() => data.value?.data ?? [])
const selected = ref<any>(null); const token = ref(''); const errorMessage = ref(''); const starting = ref(false)
async function start() { if (!selected.value) return; starting.value = true; errorMessage.value = ''; try { const r = await $fetch<any>(`/api/student/exam-sessions/${selected.value.sessionId}/start`, { method: 'POST', body: { token: token.value } }); await navigateTo(`/dashboard/exams/attempt/${r.data.attemptId}`) } catch (e: any) { errorMessage.value = e?.data?.statusMessage || 'Gagal membuka ujian' } finally { starting.value = false } }
const label: Record<string, string> = { belum: 'Siap dimulai', sedang: 'Sedang dikerjakan', dikerjakan: 'Sudah dikerjakan', belum_dibuka: 'Belum dibuka', terlambat: 'Terlambat', terkunci: 'Terkunci' }
const statusTone: Record<string, string> = {
  belum: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300',
  sedang: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-300',
  dikerjakan: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  belum_dibuka: 'bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300',
  terlambat: 'bg-rose-50 text-rose-600 dark:bg-rose-400/10 dark:text-rose-300',
  terkunci: 'bg-rose-50 text-rose-600 dark:bg-rose-400/10 dark:text-rose-300',
}
const canStart = (s: any) => ['belum', 'sedang'].includes(s.status)

const formatJakarta = (v: string | null) => formatJakartaDateTime(v)

const readyCount = computed(() => sessions.value.filter((s: any) => ['belum', 'sedang'].includes(s.status)).length)
</script>

<template>
  <div class="mx-auto max-w-6xl space-y-6 pb-8">
    <!-- ============ HEADER ============ -->
    <section class="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-8">
      <div class="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />
      <div class="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div class="max-w-xl">
          <div class="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-400/10 dark:text-emerald-300">
            <Icon name="heroicons:beaker" class="h-4 w-4" /> Penilaian
          </div>
          <h1 class="mt-4 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Ujian Saya</h1>
          <p class="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">Masukkan token dari pengawas untuk memulai ujian.</p>
        </div>
        <div class="rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-3 text-center dark:border-emerald-900/50 dark:bg-emerald-400/10">
          <p class="text-xs font-medium text-emerald-700 dark:text-emerald-300">Siap dikerjakan</p>
          <p class="mt-1 text-3xl font-bold text-emerald-600 dark:text-emerald-400">{{ readyCount }}</p>
        </div>
      </div>
    </section>

    <!-- Loading -->
    <div v-if="pending" class="grid gap-4 md:grid-cols-2">
      <div v-for="i in 4" :key="i" class="h-40 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-700/50" />
    </div>

    <!-- Empty -->
    <div v-else-if="!sessions.length" class="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-600 dark:bg-slate-800">
      <span class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300">
        <Icon name="heroicons:beaker" class="h-7 w-7" />
      </span>
      <h2 class="mt-4 font-semibold text-slate-800 dark:text-slate-100">Belum ada ujian terjadwal</h2>
      <p class="mx-auto mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">Ujian akan muncul di sini setelah dibuka oleh pengawas.</p>
    </div>

    <!-- Daftar -->
    <div v-else class="grid gap-4 md:grid-cols-2">
      <article
        v-for="s in sessions"
        :key="s.sessionId"
        class="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-emerald-700"
      >
        <span class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 opacity-0 transition group-hover:opacity-100" />
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <h2 class="truncate font-semibold text-slate-800 dark:text-slate-100">{{ s.eventName }}</h2>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ s.subjectName }} · {{ s.sesiName }}</p>
          </div>
          <span class="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold" :class="statusTone[s.status] || statusTone.dikerjakan">
            <span class="h-1.5 w-1.5 rounded-full bg-current" />{{ label[s.status] || s.status }}
          </span>
        </div>

        <div class="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
          <span class="inline-flex items-center gap-1.5"><Icon name="heroicons:calendar-days" class="h-3.5 w-3.5" /> {{ formatJakarta(s.openAt) }}</span>
          <span class="inline-flex items-center gap-1.5"><Icon name="heroicons:clock" class="h-3.5 w-3.5" /> {{ s.durationMinutes }} menit</span>
        </div>

        <button
          v-if="canStart(s)"
          class="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-600"
          @click="selected = s; token = ''; errorMessage = ''"
        >
          <Icon :name="s.status === 'sedang' ? 'heroicons:play' : 'heroicons:key'" class="h-4 w-4" />
          {{ s.status === 'sedang' ? 'Lanjutkan' : 'Mulai Ujian' }}
        </button>
      </article>
    </div>

    <!-- Modal token -->
    <Teleport to="body">
      <div v-if="selected" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" @click.self="selected = null">
        <form class="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-800" @submit.prevent="start">
          <div class="flex items-center gap-3 border-b border-slate-100 px-6 py-5 dark:border-slate-700">
            <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300"><Icon name="heroicons:key" class="h-5 w-5" /></span>
            <div>
              <h2 class="font-bold text-slate-800 dark:text-slate-100">{{ selected.subjectName }}</h2>
              <p class="text-xs text-slate-500 dark:text-slate-400">{{ selected.eventName }} · Durasi {{ selected.durationMinutes }} menit</p>
            </div>
          </div>
          <div class="space-y-4 px-6 py-5">
            <p v-if="errorMessage" class="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
              <Icon name="heroicons:exclamation-circle" class="h-4 w-4 shrink-0" /> {{ errorMessage }}
            </p>
            <label class="block text-xs font-semibold uppercase tracking-wide text-slate-400">Token ujian
              <input v-model="token" class="field mt-1.5 text-center font-mono text-lg tracking-[0.3em]" placeholder="------" required>
            </label>
          </div>
          <div class="flex justify-end gap-2 border-t border-slate-100 px-6 py-4 dark:border-slate-700">
            <button type="button" class="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700" @click="selected = null">Batal</button>
            <button class="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50" :disabled="starting">
              <Icon v-if="starting" name="heroicons:arrow-path" class="h-4 w-4 animate-spin" />
              {{ starting ? 'Membuka...' : 'Masuk Ujian' }}
            </button>
          </div>
        </form>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
@reference "~/assets/css/tailwind.css";
.field { @apply w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200; }
</style>
