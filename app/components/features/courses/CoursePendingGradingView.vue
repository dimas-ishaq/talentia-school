<template>
  <div class="space-y-6">
    <header class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
      <AppBreadcrumb :back-to="returnTo" :items="breadcrumbPending" />
      <h1 class="text-xl font-bold text-slate-800 dark:text-slate-100">Tugas Perlu Dikoreksi</h1>
      <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Daftar submission yang memerlukan penilaian (assignment & forum).</p>
    </header>

    <div v-if="error" class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">Gagal memuat antrian. <button class="underline" @click="refresh()">Coba lagi</button></div>

    <section v-if="pendingList.length === 0" class="rounded-xl border border-slate-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/10 p-6">
      <p class="text-sm text-yellow-700 dark:text-yellow-300">Tidak ada tugas yang perlu dikoreksi.</p>
    </section>

    <section v-if="pendingList.length" class="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <label class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Kelas
        <select v-model="filters.kelas" class="mt-1 block h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm dark:border-slate-600 dark:bg-slate-700">
          <option value="all">Semua kelas</option>
          <option v-for="c in classOptions" :key="c" :value="c">{{ c }}</option>
        </select>
      </label>
      <label class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Ketepatan
        <select v-model="filters.terlambat" class="mt-1 block h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm dark:border-slate-600 dark:bg-slate-700">
          <option value="all">Semua</option>
          <option value="ontime">Tepat waktu</option>
          <option value="late">Terlambat</option>
        </select>
      </label>
      <span class="ml-auto text-xs text-slate-400">{{ filteredList.length }} dari {{ pendingList.length }} submission</span>
    </section>

    <table v-if="pendingList.length" class="min-w-full overflow-hidden rounded-xl border bg-white text-sm dark:border-slate-700 dark:bg-slate-800">
      <thead class="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-700/40">
        <tr>
          <th class="px-4 py-3 font-semibold">Siswa</th>
          <th class="px-4 py-3 font-semibold">Aktivitas</th>
          <th class="px-4 py-3 font-semibold">Status</th>
          <th class="px-4 py-3 font-semibold">Submission</th>
          <th class="px-4 py-3"></th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100 dark:divide-slate-700">
        <tr v-for="item in filteredList" :key="`${item.activityId}-${item.studentId}`">
          <td class="px-4 py-3 align-top">
            <div class="font-medium text-slate-800 dark:text-slate-200">{{ item.studentName }}</div>
            <div class="text-xs text-slate-400 dark:text-slate-500">{{ item.nis }} · {{ item.className }}</div>
          </td>
          <td class="px-4 py-3 align-top">
            <div class="inline-flex items-center gap-1 text-sm font-semibold capitalize"><Icon name="heroicons:pencil-square" class="h-4 w-4" />{{ item.type }}</div>
            <div class="text-xs text-slate-400 dark:text-slate-500 mt-1">{{ item.sectionTitle }}: {{ item.title }}</div>
          </td>
          <td class="px-4 py-3 align-top">
            <span v-if="item.isLate" class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">Terlambat</span>
            <span v-else class="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">Tepat waktu</span>
          </td>
          <td class="px-4 py-3 align-top">
            <div class="max-w-md space-y-1 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-700/40 dark:text-slate-300">
              <p v-if="item.submission" class="whitespace-pre-wrap break-words">{{ item.submission }}</p>
              <p v-if="item.submissionLink"><a :href="item.submissionLink" target="_blank" rel="noopener" class="text-emerald-600 underline">{{ item.submissionLink }}</a></p>
              <p v-for="f in item.submissionFiles ?? []" :key="f.url"><a :href="f.url" target="_blank" rel="noopener" class="inline-flex items-center gap-1 text-emerald-600 underline"><Icon name="heroicons:paper-clip" class="h-3 w-3" />{{ f.name }}</a></p>
              <p v-if="!item.submission && !item.submissionLink && !item.submissionFiles?.length" class="text-slate-400">Tidak ada</p>
              <p v-if="item.returnReason" class="rounded bg-orange-50 px-2 py-1 text-[11px] text-orange-700 dark:bg-orange-900/20 dark:text-orange-300">Revisi: {{ item.returnReason }}</p>
            </div>
          </td>
          <td class="px-4 py-3 align-top text-right">
            <button class="mr-1 inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-600" @click="openModal(item)">Koreksi</button>
            <button class="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300" @click="openRevision(item)">Minta Revisi</button>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-if="gradeMessage" class="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">{{ gradeMessage }}</div>
    <div v-if="gradeError" class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">{{ gradeError }}</div>

    <!-- Modal Koreksi -->
    <!-- Modal Revisi -->
    <Teleport to="body">
      <div v-if="revisionOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="revisionOpen = false">
        <div class="w-full max-w-lg rounded-xl bg-white p-6 dark:bg-slate-800">
          <h2 class="text-base font-bold text-slate-800 dark:text-slate-100">Minta revisi: {{ revisionItem?.title }}</h2>
          <p class="mt-1 text-xs text-slate-500">Alasan akan terlihat siswa di halaman tugas.</p>
          <textarea v-model="revisionReason" rows="4" placeholder="Contoh: Harap lengkapi sumber dan perbaiki format PDF." class="mt-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700"></textarea>
          <div class="mt-4 flex justify-end gap-2">
            <button class="rounded-lg border border-slate-200 px-4 py-2 text-sm dark:border-slate-600" @click="revisionOpen = false">Batal</button>
            <button class="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50" :disabled="revisionSaving" @click="askRevision">{{ revisionSaving ? 'Mengirim...' : 'Kirim Revisi' }}</button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="modal.open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="modal.open = false">
        <div class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 dark:bg-slate-800">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 class="text-lg font-bold text-slate-800 dark:text-slate-100">Koreksi: {{ modal.item?.title }}</h2>
              <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">{{ modal.item?.studentName }} · {{ modal.item?.submission ? 'Submission tersedia' : 'Tanpa submission' }}</p>
            </div>
            <button class="text-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" @click="closeModal"><Icon name="heroicons:x-mark" class="h-5 w-5" /></button>
          </div>

          <div v-if="modal.item" class="mt-3 space-y-2 rounded-lg bg-slate-50 px-3 py-2 text-xs dark:bg-slate-700/40">
            <p v-if="modal.item.submission" class="whitespace-pre-wrap break-words text-slate-600 dark:text-slate-300">{{ modal.item.submission }}</p>
            <p v-if="modal.item.submissionLink"><a :href="modal.item.submissionLink" target="_blank" rel="noopener" class="text-emerald-600 underline">{{ modal.item.submissionLink }}</a></p>
            <p v-for="f in modal.item.submissionFiles ?? []" :key="f.url"><a :href="f.url" target="_blank" rel="noopener" class="inline-flex items-center gap-1 text-emerald-600 underline"><Icon name="heroicons:paper-clip" class="h-3 w-3" />{{ f.name }}</a></p>
          </div>

          <div v-if="modal.item && !modal.processing" class="mt-4 space-y-3">
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Nilai (skala maksimum)</label>
              <input v-model.number="scoreForm.score" type="number" min="0" class="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700">
            </div>
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Feedback / Catatan (opsional)</label>
              <textarea v-model="scoreForm.feedback" class="mt-1 h-24 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700" placeholder="Masukkan komentar..."></textarea>
            </div>
            <button class="w-full rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600" @click="submitGrade">Simpan Nilai</button>
          </div>
          <div v-else-if="modal.processing" class="mt-8 text-center">
            <span class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500"></span>
            <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">Menyimpan...</p>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { pesanDariError } from '~/composables/useStudents'

const route = useRoute()
const courseId = computed(() => String(route.params.id))
const { returnTo } = useCourseReturn(() => `/dashboard/courses/${courseId.value}`)
const { items: breadcrumbPending } = useCourseBreadcrumb({ courseId, leaf: () => ({ label: 'Tugas Perlu Dikoreksi' }) })
const { user } = useAuth()
const canManage = computed(() => user.value?.role === 'teacher' || user.value?.role === 'admin')

const { data, pending, error, refresh } = await useFetch<{ data?: any[] }>(() => `/api/courses/${courseId.value}/activities?pending=true`, { key: `course-pending-${courseId.value}` })

const pendingList = computed(() => data.value?.data ?? [])

const modal = reactive({ open: false, item: null as any, processing: false })
const scoreForm = reactive({ score: '' as number | '', feedback: '' as string })
const gradeMessage = ref('')
const gradeError = ref('')
const revisionReason = ref('')
const revisionItem = ref<any>(null)
const revisionOpen = ref(false)
const revisionSaving = ref(false)
const filters = reactive({ kelas: 'all', terlambat: 'all' })
const classOptions = computed(() => [...new Set(pendingList.value.map((i: any) => i.className).filter(Boolean))].sort())
const filteredList = computed(() => pendingList.value.filter((i: any) => {
  if (filters.kelas !== 'all' && i.className !== filters.kelas) return false
  if (filters.terlambat === 'late' && !i.isLate) return false
  if (filters.terlambat === 'ontime' && i.isLate) return false
  return true
}))

function openModal(item: any) {
  if (!canManage.value) return
  modal.item = item
  modal.open = true
  modal.processing = false
  scoreForm.score = ''
  scoreForm.feedback = ''
}

function closeModal() {
  modal.open = false
  modal.item = null
  modal.processing = false
}

async function submitGrade() {
  gradeMessage.value = ''
  gradeError.value = ''
  if (!modal.item || scoreForm.score == null || scoreForm.score === '' || Number(scoreForm.score) < 0) {
    gradeError.value = 'Masukkan nilai yang valid.'
    return
  }
  modal.processing = true
  try {
    await $fetch(`/api/courses/${courseId.value}/activities/${modal.item.activityId}/grade`, {
      method: 'POST',
      body: { studentId: modal.item.studentId, score: Number(scoreForm.score), feedback: scoreForm.feedback },
    })
    await refresh()
    closeModal()
    gradeMessage.value = 'Penilaian berhasil disimpan.'
  } catch (e: unknown) {
    gradeError.value = pesanDariError(e, 'Gagal menyimpan penilaian')
  } finally {
    modal.processing = false
  }
}
function openRevision(item: any) { revisionItem.value = item; revisionReason.value = ''; revisionOpen.value = true; gradeError.value = ''; gradeMessage.value = '' }
async function askRevision() {
  if (!revisionItem.value) return
  gradeError.value = ''; gradeMessage.value = ''
  if (revisionReason.value.trim().length < 3) {
    gradeError.value = 'Isi alasan revisi minimal 3 karakter.'
    return
  }
  revisionSaving.value = true
  try {
    await $fetch(`/api/courses/${courseId.value}/activities/${revisionItem.value.activityId}/return`, { method: 'POST', body: { studentId: revisionItem.value.studentId, reason: revisionReason.value.trim() } })
    await refresh()
    revisionOpen.value = false
    revisionItem.value = null
    gradeMessage.value = 'Revisi diminta. Nilai lama dibersihkan saat siswa kirim ulang.'
  } catch (e: unknown) { gradeError.value = pesanDariError(e, 'Gagal meminta revisi') }
  finally { revisionSaving.value = false }
}
</script>

<style scoped>
@reference "~/assets/css/tailwind.css";
.field { @apply w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500; }
.btn-primary { @apply rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600; }
.btn-secondary { @apply rounded-lg border border-slate-200 dark:border-slate-600 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700; }
.icon-btn { @apply rounded-md bg-slate-100 dark:bg-slate-700 p-1 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600; }
</style>
