<script setup lang="ts">
const route = useRoute()
const courseId = computed(() => String(route.params.id))
const quizId = computed(() => String(route.params.activityId))
const { returnTo, withReturnTo } = useCourseReturn(() => `/dashboard/courses/${courseId.value}`)
const { data: courseData, pending: coursePending, error: courseError } = await useFetch<any>(() => `/api/courses/${courseId.value}`, { key: `quiz-detail-course-${courseId.value}` })
const activity = computed(() => courseData.value?.data?.sections?.flatMap((s: any) => s.activities ?? []).find((a: any) => a.id === quizId.value))
const { data: questionData, pending: questionsPending, error: questionsError } = await useFetch<{ data: any[] }>(() => `/api/courses/${courseId.value}/quizzes/${quizId.value}/questions`, { key: `quiz-detail-questions-${quizId.value}` })
const classId = ref('')
const { data: attemptData, pending: attemptsPending, error: attemptsError, refresh: refreshAttempts } = await useFetch<{ data: any[] }>(() => `/api/courses/${courseId.value}/quizzes/${quizId.value}/attempts`, { key: `quiz-detail-attempts-${quizId.value}`, query: { classId }, watch: [classId] })
const pending = computed(() => coursePending.value || questionsPending.value || attemptsPending.value)
const loadError = computed(() => courseError.value || questionsError.value || attemptsError.value)
const questions = computed(() => questionData.value?.data ?? [])
const attempts = computed(() => attemptData.value?.data ?? [])
const submitted = computed(() => attempts.value.filter((a) => ['submitted', 'auto_submitted', 'needs_grading'].includes(a.status)))
const courseClasses = computed(() => courseData.value?.data?.classes ?? [])
const statusLabel: Record<string, string> = { in_progress: 'Mengerjakan', submitted: 'Selesai', auto_submitted: 'Waktu habis', abandoned: 'Ditinggalkan', needs_grading: 'Perlu dikoreksi' }
const average = computed(() => {
  const scores = submitted.value.map((a) => a.score).filter((score) => score != null)
  return scores.length ? (scores.reduce((sum, score) => sum + Number(score), 0) / scores.length).toFixed(1) : '-'
})
const { isAdmin, isTeacher, isStudent } = useAuth()
const quizNav = useActivityNavigation(computed(() => courseData.value?.data), quizId, isStudent)
const { items: breadcrumbItems } = useCourseBreadcrumb({ courseId, activityId: quizId, course: () => courseData.value?.data })
const canManage = computed(() => isAdmin.value || isTeacher.value)
const regrading = ref(false)
const resettingId = ref<string | null>(null)
const resettingBulk = ref(false)
const selectedIds = ref<string[]>([])
const resetMessage = ref('')
const { confirm } = useConfirm()
const regradeMessage = ref('')
const visibleAttempts = computed(() => attempts.value.slice(0, 10))
const allSelected = computed(() => visibleAttempts.value.length > 0 && visibleAttempts.value.every((a: any) => selectedIds.value.includes(a.id)))
function toggleAll() {
  selectedIds.value = allSelected.value ? [] : visibleAttempts.value.map((a: any) => a.id)
}
function toggleOne(id: string) {
  selectedIds.value = selectedIds.value.includes(id) ? selectedIds.value.filter((x) => x !== id) : [...selectedIds.value, id]
}
async function resetSelected() {
  if (!selectedIds.value.length || resettingBulk.value) return
  const ok = await confirm({ title: 'Reset pengerjaan terpilih?', message: `Hapus ${selectedIds.value.length} pengerjaan agar siswa terkait dapat mengulang quiz? Tindakan ini permanen.`, confirmLabel: 'Ya, reset', tone: 'danger' })
  if (!ok) return
  resettingBulk.value = true
  try {
    const result = await $fetch<{ deleted: number }>(`/api/courses/${courseId.value}/quizzes/${quizId.value}/attempts/bulk-reset`, { method: 'POST', body: { attemptIds: selectedIds.value } })
    selectedIds.value = []
    resetMessage.value = `${result.deleted} pengerjaan berhasil di-reset.`
    await refreshAttempts()
  } catch (error: any) { resetMessage.value = error?.data?.statusMessage || 'Gagal mereset pengerjaan.' }
  finally { resettingBulk.value = false }
}
async function resetAttempt(attempt: any) {
  if (!await confirm({ title: 'Reset pengerjaan?', message: `Hapus pengerjaan ${attempt.studentName} agar siswa dapat mengulang quiz?`, confirmLabel: 'Ya, reset', tone: 'danger' })) return
  resettingId.value = attempt.id
  try {
    await $fetch(`/api/courses/${courseId.value}/quizzes/${quizId.value}/attempts/${attempt.id}/reset`, { method: 'POST' })
    resetMessage.value = `Pengerjaan ${attempt.studentName} berhasil di-reset.`
    await refreshAttempts()
  } catch (error: any) { resetMessage.value = error?.data?.statusMessage || 'Gagal mereset pengerjaan.' }
  finally { resettingId.value = null }
}
async function regrade() {
  if (regrading.value) return
  regrading.value = true
  regradeMessage.value = ''
  try {
    const result = await $fetch<{ regradedAttempts: number }>(`/api/courses/${courseId.value}/quizzes/${quizId.value}/regrade`, { method: 'POST' })
    regradeMessage.value = `${result.regradedAttempts} pengerjaan dinilai ulang.`
    await refreshNuxtData()
  } catch (error: any) {
    regradeMessage.value = error?.data?.statusMessage || 'Gagal melakukan penilaian ulang.'
  } finally { regrading.value = false }
}
</script>

<template>
  <div class="mx-auto max-w-6xl space-y-5">
    <div v-if="pending" class="space-y-4"><div class="h-8 w-72 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" /><div class="h-28 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" /><div class="h-64 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" /></div>
    <div v-else-if="loadError || !activity" class="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">Quiz belum dapat dimuat. <button class="font-semibold underline" @click="refreshNuxtData()">Coba lagi</button></div>
    <template v-else>
    <AppBreadcrumb :back-to="returnTo" :items="breadcrumbItems" />
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div><h1 class="text-2xl font-bold text-slate-800 dark:text-slate-100">{{ activity?.title || 'Quiz' }}</h1><p class="mt-1 text-sm text-slate-500">Detail quiz dan pemantauan pengerjaan siswa</p></div>
      <div class="flex flex-wrap gap-2">
        <NuxtLink :to="withReturnTo(`/dashboard/courses/${courseId}/activities/${quizId}/edit`)" class="btn-secondary">Edit pengaturan</NuxtLink>
        <NuxtLink :to="withReturnTo(`/dashboard/courses/${courseId}/quizzes/${quizId}/manage`)" class="btn">Kelola Soal</NuxtLink>
        <NuxtLink :to="withReturnTo(`/dashboard/courses/${courseId}/quizzes/${quizId}/grading`)" class="btn-secondary">Hasil & Koreksi</NuxtLink>
        <NuxtLink :to="withReturnTo(`/dashboard/courses/${courseId}/quizzes/${quizId}/analysis`)" class="btn-secondary">Analisis Soal</NuxtLink>
        <button v-if="canManage" class="btn-secondary" :disabled="regrading" @click="regrade">{{ regrading ? 'Menilai ulang...' : 'Penilaian ulang' }}</button>
      </div>
      <p v-if="regradeMessage || resetMessage" class="mt-2 w-full text-sm text-slate-500">{{ regradeMessage || resetMessage }}</p>
    </header>

    <section class="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <div class="card"><p class="label">Status</p><p class="value">{{ activity?.status === 'published' ? 'Dipublikasikan' : 'Draft' }}</p></div>
      <div class="card"><p class="label">Jumlah soal</p><p class="value">{{ questions.length }}</p><p class="hint">Maks. {{ activity?.maxPoint ?? 100 }} poin</p></div>
      <div class="card"><p class="label">Sudah mengerjakan</p><p class="value">{{ submitted.length }}</p><p class="hint">{{ attempts.length }} total percobaan</p></div>
      <div class="card"><p class="label">Rata-rata nilai</p><p class="value">{{ average }}</p><p class="hint">Dari hasil yang dinilai</p></div>
    </section>

    <section class="card p-0 overflow-hidden">
      <div class="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700"><h2 class="font-semibold">Status pengerjaan siswa</h2><div class="flex flex-wrap items-center gap-2"><button v-if="canManage && selectedIds.length" class="h-9 rounded-lg bg-red-600 px-3 text-sm font-semibold text-white disabled:opacity-50" :disabled="resettingBulk" @click="resetSelected">{{ resettingBulk ? 'Mereset...' : `Reset terpilih (${selectedIds.length})` }}</button><select v-model="classId" class="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm dark:border-slate-600 dark:bg-slate-800"><option value="">Semua kelas</option><option v-for="cls in courseClasses" :key="cls.id" :value="cls.id">{{ cls.name }}</option></select><NuxtLink :to="withReturnTo(`/dashboard/courses/${courseId}/quizzes/${quizId}/grading`)" class="text-sm text-emerald-600">Lihat semua hasil</NuxtLink></div></div>
      <div v-if="!attempts.length" class="p-8 text-center text-sm text-slate-500">Belum ada siswa yang mengerjakan quiz.</div>
      <div v-else class="overflow-x-auto"><table class="w-full text-sm"><thead class="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-700/40"><tr><th class="p-3"><input v-if="canManage" type="checkbox" :checked="allSelected" aria-label="Pilih semua" @change="toggleAll"></th><th class="p-3">Siswa</th><th class="p-3">Kelas</th><th class="p-3">Percobaan</th><th class="p-3">Status</th><th class="p-3">Nilai</th><th class="p-3">Aksi</th><th class="p-3">Waktu kirim</th></tr></thead><tbody><tr v-for="attempt in visibleAttempts" :key="attempt.id" class="border-t dark:border-slate-700"><td class="p-3"><input v-if="canManage" type="checkbox" :checked="selectedIds.includes(attempt.id)" @change="toggleOne(attempt.id)"></td><td class="p-3 font-medium">{{ attempt.studentName }}</td><td class="p-3 text-slate-500">{{ attempt.className || '-' }}</td><td class="p-3">#{{ attempt.attemptNumber }}</td><td class="p-3">{{ statusLabel[attempt.status] || attempt.status }}</td><td class="p-3 font-semibold">{{ attempt.score ?? '-' }}</td><td class="p-3"><button v-if="canManage" class="text-red-600 underline disabled:opacity-50" :disabled="resettingId === attempt.id" @click="resetAttempt(attempt)">{{ resettingId === attempt.id ? 'Mereset...' : 'Reset' }}</button></td><td class="p-3 text-slate-500">{{ attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString('id-ID') : '-' }}</td></tr></tbody></table></div>
    </section>

    <section class="card"><h2 class="font-semibold">Informasi quiz</h2><dl class="mt-3 grid gap-3 text-sm sm:grid-cols-2"><div><dt class="text-slate-500">Durasi</dt><dd class="font-medium">{{ activity?.durationMinutes ? `${activity.durationMinutes} menit` : 'Tanpa batas waktu' }}</dd></div><div><dt class="text-slate-500">Batas percobaan</dt><dd class="font-medium">{{ activity?.maxAttempts || 'Tidak dibatasi' }}</dd></div><div><dt class="text-slate-500">Dibuka</dt><dd class="font-medium">{{ activity?.openAt ? new Date(activity.openAt).toLocaleString('id-ID') : 'Kapan saja' }}</dd></div><div><dt class="text-slate-500">Ditutup</dt><dd class="font-medium">{{ activity?.closeAt ? new Date(activity.closeAt).toLocaleString('id-ID') : 'Tidak ditentukan' }}</dd></div></dl></section>
    <ActivityNavigation :previous="quizNav.previous.value" :next="quizNav.next.value" :link="quizNav.link" />
    </template>
  </div>
</template>

<style scoped>
@reference "~/assets/css/tailwind.css";
.card { @apply rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800; }
.label { @apply text-xs font-semibold uppercase text-slate-400; }
.value { @apply mt-1 text-2xl font-bold text-slate-800 dark:text-slate-100; }
.hint { @apply text-xs text-slate-500; }
.btn { @apply rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white; }
.btn-secondary { @apply rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 dark:border-slate-600 dark:text-slate-300; }
</style>
