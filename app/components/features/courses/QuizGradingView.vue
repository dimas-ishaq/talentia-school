<script setup lang="ts">
const route = useRoute()
const { confirm } = useConfirm()
const courseId = computed(() => String(route.params.id))
const quizId = computed(() => String(route.params.activityId))
const { returnTo, withReturnTo } = useCourseReturn(() => `/dashboard/courses/${courseId.value}/quizzes/${quizId.value}`)
const { data: courseData } = await useFetch<any>(() => `/api/courses/${courseId.value}`)
const course = computed(() => courseData.value?.data)
const activity = computed(() => courseData.value?.data?.sections?.flatMap((s: any) => s.activities ?? []).find((a: any) => a.id === quizId.value))
const { items: breadcrumbItems } = useCourseBreadcrumb({ courseId, activityId: quizId, course, leaf: () => ({ label: 'Hasil & Koreksi' }) })
const { data, pending, refresh } = await useFetch<{ data: any[] }>(() => `/api/courses/${courseId.value}/quizzes/${quizId.value}/attempts`)
const attempts = computed(() => data.value?.data ?? [])
const statusLabel: Record<string, string> = { in_progress: 'Mengerjakan', submitted: 'Selesai', auto_submitted: 'Waktu habis', abandoned: 'Ditinggalkan', needs_grading: 'Perlu dikoreksi' }
const selected = ref<any>(null)
const detail = ref<any>(null)
const grades = reactive<Record<string, { pointsEarned: number; feedback: string }>>({})
const savingGrade = ref(false)
const resettingId = ref<string | null>(null)
const resettingBulk = ref(false)
const selectedIds = ref<string[]>([])
const resetMessage = ref('')
const allSelected = computed(() => attempts.value.length > 0 && attempts.value.every((a: any) => selectedIds.value.includes(a.id)))
function toggleAll() { selectedIds.value = allSelected.value ? [] : attempts.value.map((a: any) => a.id) }
function toggleOne(id: string) { selectedIds.value = selectedIds.value.includes(id) ? selectedIds.value.filter((x) => x !== id) : [...selectedIds.value, id] }
async function resetSelected() {
  if (!selectedIds.value.length || resettingBulk.value) return
  const ok = await confirm({ title: 'Reset pengerjaan terpilih?', message: `Hapus ${selectedIds.value.length} pengerjaan agar siswa terkait dapat mengulang quiz? Tindakan ini permanen.`, confirmLabel: 'Ya, reset', tone: 'danger' })
  if (!ok) return
  resettingBulk.value = true
  try {
    const result = await $fetch<{ deleted: number }>(`/api/courses/${courseId.value}/quizzes/${quizId.value}/attempts/bulk-reset`, { method: 'POST', body: { attemptIds: selectedIds.value } })
    selectedIds.value = []
    resetMessage.value = `${result.deleted} pengerjaan berhasil di-reset.`
    await refresh()
  } catch (error: any) { resetMessage.value = error?.data?.statusMessage || 'Gagal mereset pengerjaan.' }
  finally { resettingBulk.value = false }
}
async function resetAttempt(attempt: any) {
  if (resettingId.value) return
  const ok = await confirm({ title: 'Reset pengerjaan?', message: `Hapus jawaban dan nilai pengerjaan ${attempt.studentName} agar dapat mengulang quiz? Tindakan ini permanen.`, confirmLabel: 'Ya, reset', tone: 'danger' })
  if (!ok) return
  resettingId.value = attempt.id
  resetMessage.value = ''
  try {
    await $fetch(`/api/courses/${courseId.value}/quizzes/${quizId.value}/attempts/${attempt.id}/reset`, { method: 'POST' })
    selected.value = null
    detail.value = null
    resetMessage.value = `Pengerjaan ${attempt.studentName} berhasil di-reset.`
    await refresh()
  } catch (error: any) {
    resetMessage.value = error?.data?.statusMessage || 'Gagal mereset pengerjaan.'
  } finally { resettingId.value = null }
}
async function open(attempt: any) {
  selected.value = attempt
  const res = await $fetch<{ data: any }>(`/api/courses/${courseId.value}/quizzes/${quizId.value}/attempts/${attempt.id}`)
  detail.value = res.data
  for (const a of res.data.answers) grades[a.id] = { pointsEarned: a.pointsEarned ?? 0, feedback: a.feedback ?? '' }
}
function questionFor(id: string) { return detail.value?.questions.find((q: any) => q.id === id) }
function answerFor(qid: string) { return detail.value?.answers.find((a: any) => a.quizQuestionId === qid) }
async function saveGrades() {
  savingGrade.value = true
  try {
    const answers = detail.value.answers.filter((a: any) => questionFor(a.quizQuestionId)?.type === 'essay').map((a: any) => ({ answerId: a.id, pointsEarned: Number(grades[a.id]?.pointsEarned ?? 0), feedback: grades[a.id]?.feedback ?? '' }))
    await $fetch(`/api/courses/${courseId.value}/quizzes/${quizId.value}/attempts/${selected.value.id}/grade`, { method: 'POST', body: { answers } })
    await refresh()
    await open(selected.value)
  } finally { savingGrade.value = false }
}
</script>
<template>
  <div class="mx-auto max-w-5xl space-y-5">
    <AppBreadcrumb :back-to="returnTo" :items="breadcrumbItems" />
    <header class="flex items-center justify-between"><div><h1 class="text-2xl font-bold text-slate-800 dark:text-slate-100">Hasil & Koreksi</h1><p class="text-sm text-slate-500">{{ activity?.title || 'Quiz' }}</p></div><div class="flex flex-wrap items-center gap-2"><button v-if="selectedIds.length" class="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" :disabled="resettingBulk" @click="resetSelected">{{ resettingBulk ? 'Mereset...' : `Reset terpilih (${selectedIds.length})` }}</button><NuxtLink :to="withReturnTo(`/dashboard/courses/${courseId}/quizzes/${quizId}/analysis`)" class="rounded-lg border px-3 py-2 text-sm text-emerald-600">Analisis Butir Soal</NuxtLink><NuxtLink :to="withReturnTo(`/dashboard/courses/${courseId}/quizzes/${quizId}/manage`)" class="rounded-lg border px-3 py-2 text-sm">Kelola Soal</NuxtLink></div></header>
    <p v-if="resetMessage" class="rounded-lg bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">{{ resetMessage }}</p>
    <div v-if="pending" class="h-40 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-700" />
    <div v-else-if="!attempts.length" class="rounded-xl border bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800">Belum ada percobaan.</div>
    <table v-else class="w-full overflow-hidden rounded-xl border bg-white text-sm dark:border-slate-700 dark:bg-slate-800">
      <thead class="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-700/40"><tr><th class="p-3"><input type="checkbox" :checked="allSelected" aria-label="Pilih semua" @change="toggleAll"></th><th class="p-3">Siswa</th><th class="p-3">Percobaan</th><th class="p-3">Status</th><th class="p-3">Nilai</th><th class="p-3"></th></tr></thead>
      <tbody><tr v-for="a in attempts" :key="a.id" class="border-t dark:border-slate-700"><td class="p-3"><input type="checkbox" :checked="selectedIds.includes(a.id)" @change="toggleOne(a.id)"></td><td class="p-3 font-medium">{{ a.studentName }}</td><td class="p-3">#{{ a.attemptNumber }}</td><td class="p-3">{{ statusLabel[a.status] || a.status }}</td><td class="p-3 font-bold">{{ a.score ?? '-' }}</td><td class="p-3"><div class="flex gap-2"><button class="text-emerald-600 underline" @click="open(a)">Detail</button><button class="text-red-600 underline disabled:opacity-50" :disabled="resettingId === a.id" @click="resetAttempt(a)">{{ resettingId === a.id ? 'Merestart...' : 'Reset' }}</button></div></td></tr></tbody>
    </table>

    <Teleport to="body">
      <div v-if="selected && detail" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="selected = null">
        <div class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 dark:bg-slate-800">
          <div class="flex items-center justify-between"><h2 class="text-lg font-bold">{{ selected.studentName }} · #{{ selected.attemptNumber }}</h2><button @click="selected = null"><Icon name="heroicons:x-mark" class="h-5 w-5" /></button></div>
          <article v-for="(q, i) in detail.questions" :key="q.id" class="mt-4 rounded-lg border p-4 dark:border-slate-700">
            <p class="font-semibold">{{ Number(i) + 1 }}. {{ q.question }} <span class="text-xs text-slate-400">({{ q.points }} poin)</span></p>
            <template v-if="q.type === 'multiple_choice'">
              <p class="mt-2 text-sm">Jawaban siswa: <b>{{ q.options.find((o: any) => o.id === answerFor(q.id)?.selectedOptionId)?.label || '-' }}</b> <span :class="answerFor(q.id)?.isCorrect ? 'text-emerald-600' : 'text-red-500'">{{ answerFor(q.id)?.isCorrect ? '✓ Benar' : '✗ Salah' }}</span></p>
              <p class="text-xs text-slate-500">Kunci: {{ q.options.find((o: any) => o.isCorrect)?.label }}. {{ q.options.find((o: any) => o.isCorrect)?.text }}</p>
            </template>
            <template v-else>
              <p class="mt-2 whitespace-pre-wrap rounded bg-slate-50 p-3 text-sm dark:bg-slate-700/40">{{ answerFor(q.id)?.answerText || '(tidak dijawab)' }}</p>
              <div class="mt-2 flex items-center gap-2"><input v-model.number="grades[answerFor(q.id)?.id]!.pointsEarned" type="number" min="0" :max="q.points" class="h-9 w-24 rounded-lg border px-2 text-sm dark:border-slate-600 dark:bg-slate-800"> <span class="text-xs text-slate-400">/ {{ q.points }}</span><input v-model="grades[answerFor(q.id)?.id]!.feedback" class="h-9 flex-1 rounded-lg border px-3 text-sm dark:border-slate-600 dark:bg-slate-800" placeholder="Feedback (opsional)"></div>
            </template>
          </article>
          <div class="mt-5 flex justify-end gap-2"><button class="rounded-lg border px-4 py-2 text-sm" @click="selected = null">Tutup</button><button class="rounded-lg bg-emerald-500 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50" :disabled="savingGrade" @click="saveGrades">{{ savingGrade ? 'Menyimpan...' : 'Simpan Nilai' }}</button></div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
