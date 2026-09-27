<script setup lang="ts">
import type { QuestionPackage } from '~/types/questionPackage'
import { pesanDariError } from '~/composables/useStudents'

const { data, pending, error, refresh } = await useFetch<{ data: QuestionPackage[] }>('/api/question-packages')
const { confirm } = useConfirm()

const packages = computed(() => data.value?.data ?? [])

// Ringkasan cepat untuk kartu statistik di header.
const totalQuestions = computed(() => packages.value.reduce((sum, p) => sum + (p.questionCount ?? 0), 0))
const courseCount = computed(() => new Set(packages.value.map((p) => p.courseId)).size)
const averageQuestions = computed(() =>
  packages.value.length ? Math.round(totalQuestions.value / packages.value.length) : 0,
)

const stats = computed(() => [
  { label: 'Total Paket', value: packages.value.length, icon: 'heroicons:rectangle-stack', tone: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-400/10 dark:text-emerald-300' },
  { label: 'Total Soal', value: totalQuestions.value, icon: 'heroicons:document-text', tone: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-400/10 dark:text-indigo-300' },
  { label: 'Course', value: courseCount.value, icon: 'heroicons:book-open', tone: 'text-violet-600 bg-violet-50 dark:bg-violet-400/10 dark:text-violet-300' },
  { label: 'Rata-rata Soal', value: averageQuestions.value, icon: 'heroicons:chart-bar', tone: 'text-amber-600 bg-amber-50 dark:bg-amber-400/10 dark:text-amber-300' },
])

const search = ref('')
const filteredPackages = computed(() => {
  const query = search.value.trim().toLocaleLowerCase()
  if (!query) return packages.value
  return packages.value.filter((p) =>
    `${p.name} ${p.description ?? ''} ${p.courseName ?? ''}`.toLocaleLowerCase().includes(query),
  )
})

const grouped = computed(() => {
  const map = new Map<string, { courseId: string; courseName: string; items: QuestionPackage[] }>()
  for (const p of filteredPackages.value) {
    const entry = map.get(p.courseId) ?? { courseId: p.courseId, courseName: p.courseName || 'Course', items: [] }
    entry.items.push(p)
    map.set(p.courseId, entry)
  }
  return [...map.values()]
})

function formatDate(value: string | Date | null | undefined) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

const showForm = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const form = reactive({ courseId: '', name: '', description: '' })

const { data: courseData } = await useFetch<{ data: { id: string; name: string }[] }>('/api/courses')
const courses = computed(() => courseData.value?.data ?? [])

function openForm() { form.courseId = courses.value[0]?.id ?? ''; form.name = ''; form.description = ''; errorMessage.value = ''; showForm.value = true }

async function save() {
  if (!form.courseId) { errorMessage.value = 'Pilih course dulu'; return }
  if (!form.name.trim()) { errorMessage.value = 'Nama paket wajib diisi'; return }
  saving.value = true
  errorMessage.value = ''
  try {
    await $fetch(`/api/courses/${form.courseId}/question-packages`, { method: 'POST', body: { name: form.name.trim(), description: form.description.trim() } })
    showForm.value = false
    await refresh()
  } catch (e: unknown) { errorMessage.value = pesanDariError(e, 'Gagal menyimpan paket') } finally { saving.value = false }
}

async function archive(pkg: QuestionPackage) {
  if (!await confirm({ title: 'Arsipkan paket?', message: `Arsipkan paket "${pkg.name}"?`, confirmLabel: 'Ya, arsipkan', tone: 'danger' })) return
  await $fetch(`/api/question-packages/${pkg.id}`, { method: 'DELETE' })
  await refresh()
}
</script>

<template>
  <div class="mx-auto max-w-6xl space-y-6 pb-8">
    <!-- ============ HERO / HEADER ============ -->
    <section class="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-8">
      <div class="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />
      <div class="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div class="max-w-xl">
          <div class="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-400/10 dark:text-emerald-300">
            <Icon name="heroicons:archive-box" class="h-4 w-4" /> Bank Soal
          </div>
          <h1 class="mt-4 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Paket Soal</h1>
          <p class="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            Kumpulan soal per course. Quiz menarik soal dari paket dengan course yang sama.
          </p>
        </div>
        <button
          class="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-600 disabled:opacity-50"
          @click="openForm"
        >
          <Icon name="heroicons:plus" class="h-4 w-4" /> Buat Paket Soal
        </button>
      </div>

      <!-- Kartu statistik ringkas -->
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

    <!-- ============ TOOLBAR ============ -->
    <div v-if="packages.length" class="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
      <div class="relative">
        <Icon name="heroicons:magnifying-glass" class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          v-model="search"
          type="search"
          placeholder="Cari paket soal berdasarkan nama atau course..."
          class="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
        >
      </div>
      <span v-if="search" class="text-xs font-medium text-slate-500 dark:text-slate-400 sm:justify-self-end">{{ filteredPackages.length }} dari {{ packages.length }} paket</span>
    </div>

    <!-- ============ STATE: LOADING ============ -->
    <div v-if="pending" class="grid gap-4 sm:grid-cols-2">
      <div v-for="i in 4" :key="i" class="h-40 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-700/50" />
    </div>

    <!-- ============ STATE: ERROR ============ -->
    <div v-else-if="error" class="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
      <Icon name="heroicons:exclamation-triangle" class="h-5 w-5 shrink-0" />
      Gagal memuat paket soal. Coba muat ulang halaman.
    </div>

    <!-- ============ STATE: EMPTY ============ -->
    <div v-else-if="!packages.length" class="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-600 dark:bg-slate-800">
      <span class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300">
        <Icon name="heroicons:archive-box" class="h-7 w-7" />
      </span>
      <h2 class="mt-4 font-semibold text-slate-800 dark:text-slate-100">Belum ada paket soal</h2>
      <p class="mx-auto mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">Buat paket terlebih dahulu, lalu tambahkan atau import soal ke dalamnya.</p>
      <button class="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600" @click="openForm">
        <Icon name="heroicons:plus" class="h-4 w-4" /> Buat Paket Soal
      </button>
    </div>

    <!-- ============ STATE: NO SEARCH RESULT ============ -->
    <div v-else-if="!filteredPackages.length" class="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800">
      Tidak ada paket cocok dengan "<span class="font-semibold text-slate-700 dark:text-slate-200">{{ search }}</span>".
    </div>

    <!-- ============ STATE: LIST ============ -->
    <template v-else>
      <section v-for="group in grouped" :key="group.courseId" class="space-y-3">
        <div class="flex items-center gap-3">
          <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
            <Icon name="heroicons:book-open" class="h-4 w-4" />
          </span>
          <div class="min-w-0">
            <h2 class="truncate font-semibold text-slate-800 dark:text-slate-100">{{ group.courseName }}</h2>
            <p class="text-xs text-slate-400 dark:text-slate-500">{{ group.items.length }} paket · {{ group.items.reduce((s, p) => s + (p.questionCount ?? 0), 0) }} soal</p>
          </div>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <article
            v-for="pkg in group.items"
            :key="pkg.id"
            class="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-emerald-700"
          >
            <span class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 opacity-0 transition group-hover:opacity-100" />
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <h3 class="truncate font-semibold text-slate-800 dark:text-slate-100">{{ pkg.name }}</h3>
                <p class="mt-1 text-xs text-slate-400 dark:text-slate-500">Dibuat {{ formatDate(pkg.createdAt) }}</p>
              </div>
              <span class="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-300">
                <Icon name="heroicons:document-text" class="h-3.5 w-3.5" /> {{ pkg.questionCount ?? 0 }}
              </span>
            </div>

            <p class="mt-3 line-clamp-2 min-h-[2.5rem] text-sm text-slate-500 dark:text-slate-400">
              {{ pkg.description || 'Belum ada deskripsi.' }}
            </p>

            <div class="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 pt-4 dark:border-slate-700">
              <button
                class="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                @click="archive(pkg)"
              >
                <Icon name="heroicons:archive-box-arrow-down" class="h-4 w-4" /> Arsipkan
              </button>
              <NuxtLink
                :to="`/dashboard/question-packages/${pkg.id}`"
                class="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
              >
                Kelola <Icon name="heroicons:arrow-right" class="h-3.5 w-3.5" />
              </NuxtLink>
            </div>
          </article>
        </div>
      </section>
    </template>

    <!-- ============ MODAL BUAT PAKET ============ -->
    <Teleport to="body">
      <div v-if="showForm" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" @click.self="showForm = false">
        <form class="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-800" @submit.prevent="save">
          <div class="flex items-center gap-3 border-b border-slate-100 px-6 py-5 dark:border-slate-700">
            <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300">
              <Icon name="heroicons:plus" class="h-5 w-5" />
            </span>
            <div>
              <h2 class="font-bold text-slate-800 dark:text-slate-100">Buat Paket Soal</h2>
              <p class="text-xs text-slate-500 dark:text-slate-400">Paket akan dikelompokkan per course.</p>
            </div>
          </div>

          <div class="space-y-4 px-6 py-5">
            <p v-if="errorMessage" class="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
              <Icon name="heroicons:exclamation-circle" class="h-4 w-4 shrink-0" /> {{ errorMessage }}
            </p>
            <label class="block text-xs font-semibold uppercase tracking-wide text-slate-400">Course
              <select v-model="form.courseId" class="field mt-1.5">
                <option value="" disabled>Pilih course</option>
                <option v-for="c in courses" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </label>
            <label class="block text-xs font-semibold uppercase tracking-wide text-slate-400">Nama paket <span class="text-red-500">*</span>
              <input v-model="form.name" class="field mt-1.5" placeholder="Contoh: MTK Paket A">
            </label>
            <label class="block text-xs font-semibold uppercase tracking-wide text-slate-400">Deskripsi
              <textarea v-model="form.description" rows="3" class="field mt-1.5" placeholder="Opsional" />
            </label>
          </div>

          <div class="flex justify-end gap-2 border-t border-slate-100 px-6 py-4 dark:border-slate-700">
            <button type="button" class="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700" @click="showForm = false">Batal</button>
            <button :disabled="saving" class="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50">
              <Icon v-if="saving" name="heroicons:arrow-path" class="h-4 w-4 animate-spin" />
              {{ saving ? 'Menyimpan...' : 'Simpan' }}
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
