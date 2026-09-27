<script setup lang="ts">
import type { QuestionPackage } from '~/types/questionPackage'
import type { PackageQuestion } from '~/types/quiz'
import { pesanDariError } from '~/composables/useStudents'

const route = useRoute()
const { confirm } = useConfirm()
const packageId = computed(() => String(route.params.id))
const { data, pending, error, refresh } = await useFetch<{ data: QuestionPackage & { questions: PackageQuestion[] } }>(() => `/api/question-packages/${packageId.value}`)
const pkg = computed(() => data.value?.data)
const questions = computed(() => pkg.value?.questions ?? [])
const type = ref('')
const filtered = computed(() => type.value ? questions.value.filter((q) => q.type === type.value) : questions.value)

const counts = computed(() => {
  const multiple = questions.value.filter((q) => q.type !== 'essay').length
  return {
    multiple,
    essay: questions.value.length - multiple,
    points: questions.value.reduce((sum, q) => sum + (q.defaultPoints ?? 0), 0),
  }
})

const stats = computed(() => [
  { label: 'Total Soal', value: questions.value.length, icon: 'heroicons:document-text', tone: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-400/10 dark:text-emerald-300' },
  { label: 'Pilihan Ganda', value: counts.value.multiple, icon: 'heroicons:list-bullet', tone: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-400/10 dark:text-indigo-300' },
  { label: 'Essay', value: counts.value.essay, icon: 'heroicons:pencil-square', tone: 'text-violet-600 bg-violet-50 dark:bg-violet-400/10 dark:text-violet-300' },
  { label: 'Total Poin', value: counts.value.points, icon: 'heroicons:star', tone: 'text-amber-600 bg-amber-50 dark:bg-amber-400/10 dark:text-amber-300' },
])

const typeFilters = computed(() => [
  { value: '', label: 'Semua', count: questions.value.length },
  { value: 'multiple_choice', label: 'Pilihan Ganda', count: counts.value.multiple },
  { value: 'essay', label: 'Essay', count: counts.value.essay },
])

const deleting = ref('')
const errorMessage = ref('')
async function archive(id: string) {
  if (!await confirm({ title: 'Arsipkan soal?', message: 'Soal tidak akan tampil dalam paket aktif.', confirmLabel: 'Ya, arsipkan', tone: 'danger' })) return
  deleting.value = id
  try { await $fetch(`/api/question-packages/${packageId.value}/questions/${id}`, { method: 'DELETE' }); await refresh() }
  catch (e: unknown) { errorMessage.value = pesanDariError(e, 'Gagal mengarsipkan soal') }
  finally { deleting.value = '' }
}
</script>

<template>
  <div class="mx-auto max-w-6xl space-y-6 pb-8">
    <NuxtLink to="/dashboard/question-packages" class="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
      <Icon name="heroicons:arrow-left" class="h-4 w-4" /> Kembali ke Paket Soal
    </NuxtLink>

    <!-- Loading -->
    <div v-if="pending" class="h-40 animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-700/50" />

    <!-- Error -->
    <div v-else-if="error" class="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
      <Icon name="heroicons:exclamation-triangle" class="h-5 w-5 shrink-0" /> Gagal memuat paket soal.
    </div>

    <template v-else-if="pkg">
      <!-- ============ HEADER ============ -->
      <section class="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-8">
        <div class="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />
        <div class="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div class="max-w-2xl">
            <div class="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-400/10 dark:text-emerald-300">
              <Icon name="heroicons:archive-box" class="h-4 w-4" /> Paket Soal
            </div>
            <h1 class="mt-4 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{{ pkg.name }}</h1>
            <p class="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{{ pkg.description || 'Belum ada deskripsi.' }}</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <NuxtLink :to="`/dashboard/question-packages/${packageId}/import`" class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
              <Icon name="heroicons:arrow-up-tray" class="h-4 w-4" /> Import Soal
            </NuxtLink>
            <NuxtLink :to="`/dashboard/question-packages/${packageId}/create`" class="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-600">
              <Icon name="heroicons:plus" class="h-4 w-4" /> Buat Soal
            </NuxtLink>
          </div>
        </div>

        <!-- Statistik ringkas -->
        <div class="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div
            v-for="stat in stats"
            :key="stat.label"
            class="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-700 dark:bg-slate-900/30"
          >
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

      <p v-if="errorMessage" class="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
        <Icon name="heroicons:exclamation-circle" class="h-4 w-4 shrink-0" /> {{ errorMessage }}
      </p>

      <!-- ============ FILTER ============ -->
      <div class="flex flex-wrap items-center gap-2">
        <button
          v-for="opt in typeFilters"
          :key="opt.value"
          class="inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition"
          :class="type === opt.value
            ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300'
            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'"
          @click="type = opt.value"
        >
          {{ opt.label }}
          <span class="rounded-full bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-300">{{ opt.count }}</span>
        </button>
      </div>

      <!-- ============ EMPTY ============ -->
      <div v-if="!filtered.length" class="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-600 dark:bg-slate-800">
        <span class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300">
          <Icon name="heroicons:document-text" class="h-7 w-7" />
        </span>
        <h2 class="mt-4 font-semibold text-slate-800 dark:text-slate-100">{{ questions.length ? 'Tidak ada soal untuk filter ini' : 'Belum ada soal dalam paket' }}</h2>
        <p class="mx-auto mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">Tambahkan soal baru atau import dari file untuk mulai mengisi paket ini.</p>
        <NuxtLink :to="`/dashboard/question-packages/${packageId}/create`" class="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600">
          <Icon name="heroicons:plus" class="h-4 w-4" /> Buat Soal
        </NuxtLink>
      </div>

      <!-- ============ DAFTAR SOAL ============ -->
      <div v-else class="grid gap-4 sm:grid-cols-2">
        <article
          v-for="(q, i) in filtered"
          :key="q.id"
          class="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-emerald-700"
        >
          <div class="flex items-start justify-between gap-3">
            <span
              class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
              :class="q.type === 'essay' ? 'bg-violet-50 text-violet-600 dark:bg-violet-400/10 dark:text-violet-300' : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-300'"
            >
              <Icon :name="q.type === 'essay' ? 'heroicons:pencil-square' : 'heroicons:list-bullet'" class="h-3.5 w-3.5" />
              {{ q.type === 'essay' ? 'Essay' : 'Pilihan Ganda' }}
            </span>
            <span class="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
              <Icon name="heroicons:star" class="h-3.5 w-3.5" /> {{ q.defaultPoints }} poin
            </span>
          </div>

          <div class="mt-3 flex gap-3">
            <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500 dark:bg-slate-700 dark:text-slate-300">{{ i + 1 }}</span>
            <p class="whitespace-pre-wrap text-sm font-medium leading-relaxed text-slate-800 dark:text-slate-100">{{ q.question }}</p>
          </div>

          <div v-if="q.options?.length" class="mt-3 grid gap-1.5 pl-10">
            <div
              v-for="o in q.options"
              :key="o.id || o.label"
              class="flex items-start gap-2 rounded-lg px-2.5 py-1.5 text-xs"
              :class="o.isCorrect ? 'bg-emerald-50 font-semibold text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400'"
            >
              <span class="font-semibold">{{ o.label }}.</span>
              <span class="flex-1">{{ o.text }}</span>
              <Icon v-if="o.isCorrect" name="heroicons:check-circle" class="h-4 w-4 shrink-0" />
            </div>
          </div>

          <div class="mt-auto flex justify-end border-t border-slate-100 pt-3 dark:border-slate-700">
            <button
              class="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-900/20"
              :disabled="deleting === q.id"
              @click="archive(q.id)"
            >
              <Icon name="heroicons:archive-box-arrow-down" class="h-4 w-4" />
              {{ deleting === q.id ? 'Mengarsipkan...' : 'Arsipkan' }}
            </button>
          </div>
        </article>
      </div>
    </template>
  </div>
</template>
