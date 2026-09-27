<script setup lang="ts">
import { pesanDariError } from '~/composables/useStudents'

const route = useRoute()
const id = computed(() => String(route.params.id))
const { returnTo } = useCourseReturn(() => `/dashboard/courses/${id.value}`)
const search = ref('')

const { data, pending, error, refresh } = await useFetch(() => `/api/courses/${id.value}/progress`, { key: `progress-${id.value}` })
const { items: breadcrumbProgress } = useCourseBreadcrumb({ courseId: id, leaf: () => ({ label: 'Progress Siswa' }) })
const progress = computed<any>(() => data.value?.data)

const activities = computed<any[]>(() => progress.value?.activities ?? [])
const students = computed<any[]>(() => progress.value?.students ?? [])

const filteredStudents = computed(() => {
  if (!search.value.trim()) return students.value
  const q = search.value.trim().toLowerCase()
  return students.value.filter((s: any) => s.name.toLowerCase().includes(q))
})

function getProgress(student: any, activityId: string) {
  return student.progress?.find((p: any) => p.activityId === activityId)
}

const selectedSubmission = ref<{ student: any; activity: any; p: any } | null>(null)
const gradeForm = reactive({ score: '' as number | '', feedback: '' })
const savingGrade = ref(false)
const gradeMessage = ref('')
const gradeError = ref('')

function isReading(activity: any) { return activity.type === 'text' }
function isDone(activity: any, p: any) { return isReading(activity) ? p.completed : p.viewed }

function exportCsv() {
  window.open(`/api/courses/${id.value}/progress-export`, '_blank')
}

async function reloadProgress() { await refresh() }

function openSubmission(student: any, activity: any, p: any) {
  selectedSubmission.value = { student, activity, p }
  gradeForm.score = p.score ?? ''
  gradeForm.feedback = p.feedback ?? ''
}

async function saveGrade() {
  if (!selectedSubmission.value) return
  const { student, activity } = selectedSubmission.value
  gradeMessage.value = ''
  gradeError.value = ''
  if (gradeForm.score === '' || Number(gradeForm.score) < 0) {
    gradeError.value = 'Masukkan nilai yang valid.'
    return
  }
  savingGrade.value = true
  try {
    await $fetch(`/api/courses/${id.value}/activities/${activity.id}/grade`, {
      method: 'POST',
      body: { studentId: student.id, score: Number(gradeForm.score), feedback: gradeForm.feedback },
    })
    await refresh()
    selectedSubmission.value = null
    gradeMessage.value = 'Nilai berhasil disimpan.'
  } catch (e: unknown) {
    gradeError.value = pesanDariError(e, 'Gagal menyimpan nilai')
  } finally {
    savingGrade.value = false
  }
}
</script>

<template>
  <div class="space-y-5">
    <div v-if="pending" class="h-72 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-700" />
    <div v-else-if="error" class="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-5 text-red-700 dark:text-red-300">
      Gagal memuat progress. <button class="underline" @click="() => refresh()">Coba lagi</button>
    </div>
    <div v-if="gradeMessage" class="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">{{ gradeMessage }}</div>
    <div v-if="gradeError" class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">{{ gradeError }}</div>
    <template v-else>
      <AppBreadcrumb :back-to="returnTo" :items="breadcrumbProgress" />
      <div class="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
        <div>
          <h1 class="text-2xl font-bold text-slate-800 dark:text-slate-100">Progress Siswa</h1>
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ students.length }} siswa · {{ activities.length }} kegiatan</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <input v-model="search" class="field max-w-xs" placeholder="Cari nama siswa..." />
          <button class="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700" :disabled="pending" @click="reloadProgress">
            <Icon name="heroicons:arrow-path" class="h-4 w-4" :class="{ 'animate-spin': pending }" /> Muat ulang
          </button>
          <button class="inline-flex items-center gap-1.5 rounded-lg border border-emerald-600 px-3 py-2 text-sm font-semibold text-emerald-600 hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-400 dark:text-emerald-400 dark:hover:bg-emerald-900/20" :disabled="!students.length || !activities.length" @click="exportCsv">
            <Icon name="heroicons:arrow-down-tray" class="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>

      <div v-if="!activities.length || !students.length" class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-10 text-center text-sm text-slate-500 dark:text-slate-400">
        Belum ada data progress.
      </div>
      <div v-else class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <th class="sticky left-0 z-10 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Siswa</th>
              <th class="px-2 py-3 text-center text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                <div class="w-16">Viewed</div>
              </th>
              <th class="px-2 py-3 text-center text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                <div class="w-16">Submitted</div>
              </th>
              <th class="px-2 py-3 text-center text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                <div class="w-16">Total</div>
              </th>
              <template v-for="activity in activities" :key="activity.id">
                <th class="px-2 py-3 text-center text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 min-w-[3rem] max-w-[6rem] truncate" :title="`${activity.sectionTitle}: ${activity.title}`">
                  <div class="text-[10px] text-slate-400 dark:text-slate-500 truncate">{{ activity.sectionTitle }}</div>
                  <div class="truncate">{{ activity.title }}</div>
                </th>
              </template>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(student, si) in filteredStudents" :key="student.id" class="border-b border-slate-100 dark:border-slate-700 transition hover:bg-slate-50 dark:hover:bg-slate-700/50" :class="{ 'bg-slate-50 dark:bg-slate-700/30': si % 2 === 1 }">
              <td class="sticky left-0 z-10 bg-white dark:bg-slate-800 px-4 py-3 text-sm" :class="{ 'bg-slate-50 dark:bg-slate-700/30': si % 2 === 1 }">
                <div class="font-semibold text-slate-800 dark:text-slate-200">{{ student.name }}</div>
                <div class="text-xs text-slate-400 dark:text-slate-500">{{ student.nis }} · {{ student.className }}</div>
              </td>
              <td class="px-2 py-3 text-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">{{ student.progress.filter((p: any) => p.viewed).length }}</td>
              <td class="px-2 py-3 text-center text-xs font-semibold text-blue-600 dark:text-blue-400">{{ student.progress.filter((p: any) => p.submitted).length }}</td>
              <td class="px-2 py-3 text-center text-xs font-semibold text-slate-700 dark:text-slate-300">{{ activities.length }}</td>
              <td v-for="activity in activities" :key="activity.id" class="px-2 py-3 text-center">
                <template v-if="getProgress(student, activity.id)">
                  <span v-if="getProgress(student, activity.id).graded && getProgress(student, activity.id).score != null" class="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300" :title="getProgress(student, activity.id).feedback || ''">{{ getProgress(student, activity.id).score }}</span>
                  <span v-else-if="getProgress(student, activity.id).submitted" class="inline-flex cursor-pointer items-center justify-center rounded px-2 py-1 text-xs font-semibold" :class="getProgress(student, activity.id).late ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'" :title="getProgress(student, activity.id).late ? 'Dikumpulkan terlambat — klik untuk koreksi' : 'Klik untuk koreksi'" @click="openSubmission(student, activity, getProgress(student, activity.id))">/=</span>
                  <span v-else-if="isDone(activity, getProgress(student, activity.id))" class="inline-flex items-center justify-center text-emerald-500 dark:text-emerald-400" :title="isReading(activity) ? 'Sudah selesai dibaca' : 'Sudah dilihat'"><Icon name="heroicons:check" class="h-4 w-4" /></span>
                  <span v-else class="inline-flex items-center justify-center text-slate-300 dark:text-slate-600">-</span>
                </template>
                <span v-else class="text-slate-300 dark:text-slate-600">-</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="filteredStudents.length < students.length" class="text-sm text-slate-400">
        Menampilkan {{ filteredStudents.length }} dari {{ students.length }} siswa.
      </p>
    </template>

    <Teleport to="body">
      <div v-if="selectedSubmission" class="modal-bg" @click.self="selectedSubmission = null">
        <div class="modal bg-white dark:bg-slate-800 max-h-[90vh] overflow-y-auto">
          <div class="flex items-start justify-between">
            <div>
              <h2 class="modal-title text-slate-800 dark:text-slate-100">{{ selectedSubmission.activity.title }}</h2>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {{ selectedSubmission.student.name }}
                <span v-if="selectedSubmission.p.late" class="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600 dark:bg-red-900/30 dark:text-red-400">Terlambat</span>
              </p>
            </div>
            <button class="text-xl text-slate-400" @click="selectedSubmission = null"><Icon name="heroicons:x-mark" class="h-5 w-5" /></button>
          </div>

          <div class="mt-5 space-y-2 rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-700 dark:bg-slate-700/50 dark:text-slate-300">
            <p v-if="selectedSubmission.p.returned" class="rounded bg-orange-50 px-2 py-1 text-xs font-semibold text-orange-700 dark:bg-orange-900/20 dark:text-orange-300">Dikembalikan: {{ selectedSubmission.p.returnReason || 'Harap revisi.' }}</p>
            <p v-if="selectedSubmission.p.submission" class="whitespace-pre-wrap">{{ selectedSubmission.p.submission }}</p>
            <p v-if="selectedSubmission.p.submissionLink"><a :href="selectedSubmission.p.submissionLink" target="_blank" rel="noopener" class="text-emerald-600 underline">{{ selectedSubmission.p.submissionLink }}</a></p>
            <p v-for="f in selectedSubmission.p.submissionFiles ?? []" :key="f.url"><a :href="f.url" target="_blank" rel="noopener" class="inline-flex items-center gap-1 text-emerald-600 underline"><Icon name="heroicons:paper-clip" class="h-3 w-3" />{{ f.name }}</a></p>
            <p v-if="!selectedSubmission.p.submission && !selectedSubmission.p.submissionLink && !selectedSubmission.p.submissionFiles?.length" class="text-slate-400">Tidak ada konten submission.</p>
          </div>

          <div class="mt-5 grid gap-3 sm:grid-cols-2">
            <div>
              <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Nilai</label>
              <input v-model="gradeForm.score" type="number" min="0" class="field" placeholder="0">
            </div>
            <div class="sm:col-span-2">
              <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Feedback (opsional)</label>
              <textarea v-model="gradeForm.feedback" class="field h-20" placeholder="Catatan untuk siswa..."></textarea>
            </div>
          </div>

          <div class="mt-5 flex justify-end gap-2">
            <button class="btn-secondary" @click="selectedSubmission = null">Tutup</button>
            <button class="btn-primary disabled:opacity-50" :disabled="savingGrade" @click="saveGrade">{{ savingGrade ? 'Menyimpan...' : 'Simpan Nilai' }}</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
@reference "~/assets/css/tailwind.css";
.field { @apply w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400; }
.modal-bg { @apply fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4; }
.modal { @apply w-full max-w-lg rounded-xl bg-white dark:bg-slate-800 p-6 shadow-xl; }
.modal-title { @apply text-lg font-bold text-slate-800 dark:text-slate-100; }
</style>