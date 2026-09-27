<script setup lang="ts">
import type { ExamEventList, ExamEventForm } from '~/types/exam'
import { extractError } from '~/types/exam'

type Exam = ExamEventList

const { data, pending, refresh } = await useFetch<{ data: Exam[] }>('/api/exam-events')
const { confirm } = useConfirm()
const exams = computed(() => data.value?.data ?? [])
const open = ref(false)
const saving = ref(false)
const deleting = ref<string | null>(null)
const errorMessage = ref('')
const editingId = ref<string | null>(null)
const form = reactive<ExamEventForm>({ name: '', type: 'PAS', academicYear: '', semester: 'ganjil', startDate: '', endDate: '', description: '' })

// Ringkasan cepat.
const stats = computed(() => [
  { label: 'Total Event', value: exams.value.length, icon: 'heroicons:clipboard-document-list', tone: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-400/10 dark:text-emerald-300' },
  { label: 'Terbit', value: exams.value.filter((e) => e.status === 'published').length, icon: 'heroicons:check-badge', tone: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-400/10 dark:text-indigo-300' },
  { label: 'Draft', value: exams.value.filter((e) => e.status === 'draft').length, icon: 'heroicons:pencil-square', tone: 'text-amber-600 bg-amber-50 dark:bg-amber-400/10 dark:text-amber-300' },
  { label: 'Selesai', value: exams.value.filter((e) => e.status === 'closed').length, icon: 'heroicons:lock-closed', tone: 'text-slate-600 bg-slate-100 dark:bg-slate-700 dark:text-slate-300' },
])

function reset() {
  editingId.value = null
  Object.assign(form, { name: '', type: 'PAS', academicYear: '', semester: 'ganjil', startDate: '', endDate: '', description: '' })
  errorMessage.value = ''
  open.value = true
}

function edit(exam: Exam) {
  editingId.value = exam.id
  Object.assign(form, { name: exam.name, type: exam.type, academicYear: exam.academicYear, semester: exam.semester, startDate: exam.startDate, endDate: exam.endDate, description: exam.description || '' })
  errorMessage.value = ''
  open.value = true
}

async function save() {
  saving.value = true
  errorMessage.value = ''
  try {
    const id = editingId.value
    if (id) {
      await $fetch(`/api/exam-events/${id}`, { method: 'PATCH', body: form })
      await refresh()
    } else {
      const r = await $fetch<{ data: { id: string } }>('/api/exam-events', { method: 'POST', body: form })
      await navigateTo(`/dashboard/exams/${r.data.id}`)
    }
    open.value = false
  } catch (e: unknown) {
    errorMessage.value = extractError(e, editingId.value ? 'Gagal memperbarui event' : 'Gagal membuat event')
  } finally {
    saving.value = false
  }
}

async function remove(exam: Exam) {
  if (!await confirm({ title: 'Hapus event ujian?', message: `Hapus event ujian "${exam.name}"?`, confirmLabel: 'Ya, hapus', tone: 'danger' })) return
  deleting.value = exam.id
  errorMessage.value = ''
  try {
    await $fetch(`/api/exam-events/${exam.id}`, { method: 'DELETE' })
    await refresh()
  } catch (e: unknown) {
    errorMessage.value = extractError(e, 'Gagal menghapus event')
  } finally {
    deleting.value = null
  }
}

const label: Record<string, string> = { draft: 'Draft', published: 'Terbit', closed: 'Selesai' }
const statusTone: Record<string, string> = {
  draft: 'bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300',
  published: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300',
  closed: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
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
            <Icon name="heroicons:beaker" class="h-4 w-4" /> Penilaian
          </div>
          <h1 class="mt-4 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Manajemen Ujian</h1>
          <p class="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">Kelola event, sesi, mapel, soal, peserta, dan monitoring ujian.</p>
        </div>
        <button class="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-600" @click="reset">
          <Icon name="heroicons:plus" class="h-4 w-4" /> Event Ujian
        </button>
      </div>

      <!-- Ringkasan -->
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

    <div v-if="errorMessage" class="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
      <Icon name="heroicons:exclamation-circle" class="h-5 w-5 shrink-0" /> {{ errorMessage }}
    </div>

    <!-- Loading -->
    <div v-if="pending" class="grid gap-4 md:grid-cols-2">
      <div v-for="i in 4" :key="i" class="h-40 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-700/50" />
    </div>

    <!-- Empty -->
    <div v-else-if="!exams.length" class="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-600 dark:bg-slate-800">
      <span class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300">
        <Icon name="heroicons:beaker" class="h-7 w-7" />
      </span>
      <h2 class="mt-4 font-semibold text-slate-800 dark:text-slate-100">Belum ada event ujian</h2>
      <p class="mx-auto mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">Buat event ujian pertama, lalu tambahkan sesi, mapel, dan soal.</p>
      <button class="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600" @click="reset">
        <Icon name="heroicons:plus" class="h-4 w-4" /> Event Ujian
      </button>
    </div>

    <!-- Daftar -->
    <div v-else class="grid gap-4 md:grid-cols-2">
      <article
        v-for="exam in exams"
        :key="exam.id"
        class="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-emerald-700"
      >
        <span class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 opacity-0 transition group-hover:opacity-100" />
        <div class="flex items-start justify-between gap-3">
          <NuxtLink :to="`/dashboard/exams/${exam.id}`" class="min-w-0 flex-1">
            <h2 class="truncate font-semibold text-slate-800 transition group-hover:text-emerald-600 dark:text-slate-100 dark:group-hover:text-emerald-400">{{ exam.name }}</h2>
          </NuxtLink>
          <span class="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold" :class="statusTone[exam.status] || statusTone.closed">
            <span class="h-1.5 w-1.5 rounded-full bg-current" />{{ label[exam.status] || exam.status }}
          </span>
        </div>

        <div class="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
          <span class="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600 dark:bg-slate-700 dark:text-slate-300">{{ exam.type }}</span>
          <span class="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600 dark:bg-slate-700 dark:text-slate-300">Semester {{ exam.semester }}</span>
          <span class="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600 dark:bg-slate-700 dark:text-slate-300">{{ exam.academicYear }}</span>
        </div>

        <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
          <span class="inline-flex items-center gap-1"><Icon name="heroicons:calendar-days" class="h-3.5 w-3.5" /> {{ exam.startDate }} — {{ exam.endDate }}</span>
        </div>
        <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
          <span class="inline-flex items-center gap-1"><Icon name="heroicons:book-open" class="h-3.5 w-3.5" /> {{ exam.subjects?.length || 0 }} mapel</span>
          <span class="inline-flex items-center gap-1"><Icon name="heroicons:building-library" class="h-3.5 w-3.5" /> {{ exam.classes?.length || 0 }} kelas</span>
        </div>

        <div class="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 pt-4 dark:border-slate-700">
          <NuxtLink :to="`/dashboard/exams/${exam.id}`" class="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white">
            Kelola <Icon name="heroicons:arrow-right" class="h-3.5 w-3.5" />
          </NuxtLink>
          <div class="flex items-center gap-1">
            <button class="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20" @click="edit(exam)">
              <Icon name="heroicons:pencil" class="h-4 w-4" /> Edit
            </button>
            <button v-if="exam.status === 'draft'" class="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-900/20" :disabled="deleting === exam.id" @click="remove(exam)">
              <Icon name="heroicons:trash" class="h-4 w-4" /> {{ deleting === exam.id ? 'Menghapus...' : 'Hapus' }}
            </button>
          </div>
        </div>
      </article>
    </div>

    <!-- ============ MODAL EVENT ============ -->
    <Teleport to="body">
      <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" @click.self="open = false">
        <form class="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-800" @submit.prevent="save">
          <div class="flex items-center gap-3 border-b border-slate-100 px-6 py-5 dark:border-slate-700">
            <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300">
              <Icon :name="editingId ? 'heroicons:pencil-square' : 'heroicons:plus'" class="h-5 w-5" />
            </span>
            <div>
              <h2 class="font-bold text-slate-800 dark:text-slate-100">{{ editingId ? 'Edit Event Ujian' : 'Event Ujian Baru' }}</h2>
              <p class="text-xs text-slate-500 dark:text-slate-400">Atur identitas dan periode ujian.</p>
            </div>
          </div>

          <div class="space-y-4 px-6 py-5">
            <p v-if="errorMessage" class="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
              <Icon name="heroicons:exclamation-circle" class="h-4 w-4 shrink-0" /> {{ errorMessage }}
            </p>
            <label class="block text-xs font-semibold uppercase tracking-wide text-slate-400">Nama event
              <input v-model="form.name" class="field mt-1.5" placeholder="Contoh: PAS Ganjil 2025/2026" required>
            </label>
            <div class="grid grid-cols-2 gap-3">
              <label class="block text-xs font-semibold uppercase tracking-wide text-slate-400">Jenis
                <select v-model="form.type" class="field mt-1.5">
                  <option v-for="x in ['ASTS','ASAS','PAS','PAT','TRYOUT','SCHOOL_EXAM']" :key="x">{{ x }}</option>
                </select>
              </label>
              <label class="block text-xs font-semibold uppercase tracking-wide text-slate-400">Tahun ajaran
                <input v-model="form.academicYear" class="field mt-1.5" placeholder="2025/2026" required>
              </label>
            </div>
            <label class="block text-xs font-semibold uppercase tracking-wide text-slate-400">Semester
              <select v-model="form.semester" class="field mt-1.5">
                <option value="ganjil">Ganjil</option>
                <option value="genap">Genap</option>
              </select>
            </label>
            <div class="grid grid-cols-2 gap-3">
              <label class="block text-xs font-semibold uppercase tracking-wide text-slate-400">Tanggal mulai
                <input v-model="form.startDate" type="date" class="field mt-1.5" required>
              </label>
              <label class="block text-xs font-semibold uppercase tracking-wide text-slate-400">Tanggal selesai
                <input v-model="form.endDate" type="date" class="field mt-1.5" required>
              </label>
            </div>
            <label class="block text-xs font-semibold uppercase tracking-wide text-slate-400">Deskripsi
              <textarea v-model="form.description" class="field mt-1.5" rows="3" placeholder="Opsional" />
            </label>
          </div>

          <div class="flex justify-end gap-2 border-t border-slate-100 px-6 py-4 dark:border-slate-700">
            <button type="button" class="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700" @click="open = false">Batal</button>
            <button class="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50" :disabled="saving">
              <Icon v-if="saving" name="heroicons:arrow-path" class="h-4 w-4 animate-spin" />
              {{ saving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Buat Event' }}
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
