<script setup lang="ts">
import type { PackageQuestion, QuizQuestion } from '~/types/quiz'
import type { QuestionPackage } from '~/types/questionPackage'
const route = useRoute()
const courseId = computed(() => String(route.params.id))
const quizId = computed(() => String(route.params.activityId || route.params.quizId))
const { returnTo, withReturnTo } = useCourseReturn(() => `/dashboard/courses/${courseId.value}/quizzes/${quizId.value}`)
const { data: courseData } = await useFetch<any>(() => `/api/courses/${courseId.value}`)
const course = computed(() => courseData.value?.data)
const activity = computed(() => course.value?.sections?.flatMap((s: any) => s.activities ?? []).find((a: any) => a.id === quizId.value))
const { items: breadcrumbItems } = useCourseBreadcrumb({ courseId, activityId: quizId, course, leaf: () => ({ label: 'Kelola Soal' }) })
const targetClassIds = ref<string[]>([])
const { data: questionData, refresh } = await useFetch<{ data: QuizQuestion[] }>(() => `/api/courses/${courseId.value}/quizzes/${quizId.value}/questions`)
const { data: packageData } = await useFetch<{ data: QuestionPackage[] }>(() => `/api/courses/${courseId.value}/question-packages`)
const selectedPackage = ref('')
const selectedBank = ref<string[]>([])
const manual = reactive({ type: 'essay' as 'essay' | 'multiple_choice', question: '', points: 1, options: Array.from({ length: 5 }, (_, i) => ({ label: String.fromCharCode(65 + i), text: '', isCorrect: i === 0 })) })
const questions = computed(() => questionData.value?.data ?? [])
const packages = computed(() => packageData.value?.data ?? [])
const totalPoints = computed(() => questions.value.reduce((sum, question) => sum + Number(question.points || 0), 0))
const bank = ref<PackageQuestion[]>([])
const saving = ref(false)
const previewOpen = ref(false)
const previewIndex = ref(0)
const previewQuestion = computed(() => questions.value[previewIndex.value])
function openPreview() { if (!questions.value.length) return; previewIndex.value = 0; previewOpen.value = true }
function closePreview() { previewOpen.value = false }
function addOption() {
  const index = manual.options.length
  manual.options.push({ label: String.fromCharCode(65 + index), text: '', isCorrect: false })
}
function setCorrect(index: number) {
  manual.options.forEach((option, i) => { option.isCorrect = i === index })
}
async function loadPackageQuestions() {
  bank.value = []
  selectedBank.value = []
  if (!selectedPackage.value) return
  const res = await $fetch<{ data: { questions: PackageQuestion[] } }>(`/api/question-packages/${selectedPackage.value}`)
  bank.value = (res.data.questions ?? []).filter((q) => q.isActive)
}
watch(selectedPackage, loadPackageQuestions)

const allBankSelected = computed(() => bank.value.length > 0 && selectedBank.value.length === bank.value.length)
function toggleAllBank() { selectedBank.value = allBankSelected.value ? [] : bank.value.map((q) => q.id) }

async function addBank() {
  if (!selectedPackage.value) return
  saving.value = true
  try {
    // Tanpa centang = ambil seluruh paket. Dengan centang = hanya soal terpilih.
    const body = selectedBank.value.length
      ? { questions: selectedBank.value.map((id) => ({ bankQuestionId: id })) }
      : { packageId: selectedPackage.value }
    await $fetch(`/api/courses/${courseId.value}/quizzes/${quizId.value}/questions`, { method: 'POST', body })
    selectedBank.value = []
    await refresh()
  } finally { saving.value = false }
}
async function addManual() { if (!manual.question.trim()) return; await $fetch(`/api/courses/${courseId.value}/quizzes/${quizId.value}/questions`, { method: 'POST', body: { questions: [{ type: manual.type, question: manual.question, points: Number(manual.points), targetClassIds: targetClassIds.value.length ? targetClassIds.value : null, options: manual.type === 'multiple_choice' ? manual.options : [] }] } }); manual.question = ''; targetClassIds.value = []; await refresh() }
async function remove(id: string) { await $fetch(`/api/courses/${courseId.value}/quizzes/${quizId.value}/questions/${id}`, { method: 'DELETE' }); await refresh() }
</script>
<template>
  <div class="mx-auto max-w-6xl space-y-5">
    <AppBreadcrumb :back-to="returnTo" :items="breadcrumbItems" />
    <header class="flex flex-wrap items-start justify-between gap-3"><div><p class="text-xs font-semibold uppercase tracking-wide text-emerald-600">{{ activity?.title || 'Quiz' }}</p><h1 class="mt-1 text-2xl font-bold text-slate-800 dark:text-slate-100">Kelola soal</h1><p class="mt-1 text-sm text-slate-500">Susun pertanyaan, bobot, dan kunci jawaban quiz.</p></div><div class="flex flex-wrap gap-2"><NuxtLink :to="withReturnTo(`/dashboard/courses/${courseId}/activities/${quizId}/edit`)" class="btn-secondary">Edit pengaturan</NuxtLink><NuxtLink :to="withReturnTo(`/dashboard/courses/${courseId}/quizzes/${quizId}/grading`)" class="btn-secondary">Hasil pengerjaan</NuxtLink><button class="btn" :disabled="!questions.length" @click="openPreview">Pratinjau quiz</button></div></header>
    <section class="grid grid-cols-2 gap-3 sm:grid-cols-3"><div class="summary-card"><span>Jumlah soal</span><strong>{{ questions.length }}</strong></div><div class="summary-card"><span>Total bobot</span><strong>{{ totalPoints }}</strong><small>poin</small></div><div class="summary-card"><span>Status</span><strong :class="questions.length ? 'text-emerald-600' : 'text-amber-600'">{{ questions.length ? 'Siap diatur' : 'Belum ada soal' }}</strong></div></section>
    <section class="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <div><h2 class="font-semibold">Tambahkan dari paket soal</h2><p class="mt-1 text-sm text-slate-500">Pilih paket untuk memasukkan soal yang sudah tersedia.</p></div>
      <select v-model="selectedPackage" class="field mt-3"><option value="">Pilih paket soal</option><option v-for="pkg in packages" :key="pkg.id" :value="pkg.id">{{ pkg.name }} ({{ pkg.questionCount ?? 0 }} soal)</option></select>
      <template v-if="selectedPackage && bank.length">
        <label class="mt-3 flex items-center gap-2 text-sm font-medium"><input type="checkbox" :checked="allBankSelected" @change="toggleAllBank"> Pilih semua ({{ bank.length }} soal)</label>
        <div class="mt-2 max-h-56 space-y-2 overflow-auto"><label v-for="q in bank" :key="q.id" class="flex gap-2 text-sm"><input v-model="selectedBank" type="checkbox" :value="q.id"><span>{{ q.question }}</span></label></div>
      </template>
      <p v-else-if="selectedPackage" class="mt-3 text-sm text-slate-500">Paket ini belum memiliki soal aktif.</p>
      <button class="btn mt-3" :disabled="saving || !selectedPackage || !bank.length" @click="addBank">{{ selectedBank.length ? `Tambahkan ${selectedBank.length} soal terpilih` : 'Tambahkan semua soal paket' }}</button>
    </section>
    <section class="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"><h2 class="font-semibold">Buat soal baru</h2><p class="mt-1 text-sm text-slate-500">Tulis soal manual, lalu tentukan tipe dan bobotnya.</p><div class="mt-3 grid gap-3 sm:grid-cols-3"><select v-model="manual.type" class="field"><option value="essay">Essay</option><option value="multiple_choice">Pilihan ganda</option></select><input v-model.number="manual.points" type="number" min="0" class="field" placeholder="Bobot"><input v-model="manual.question" class="field sm:col-span-3" placeholder="Pertanyaan"></div><div v-if="course?.classes?.length" class="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-600 dark:bg-slate-700/30"><p class="mb-1 text-xs font-medium text-slate-600 dark:text-slate-400">Kelompok siswa (opsional, kosongkan = semua)</p><div class="flex flex-wrap gap-2"><label v-for="cls in course.classes" :key="cls.id" class="flex items-center gap-1.5 rounded-md bg-white px-2 py-1 text-sm dark:bg-slate-800"><input v-model="targetClassIds" type="checkbox" :value="cls.id"> {{ cls.name }}</label></div></div><div v-if="manual.type === 'multiple_choice'" class="mt-3 space-y-2"><div v-for="(option, index) in manual.options" :key="option.label" class="flex items-center gap-2"><input :checked="option.isCorrect" type="radio" name="manual-correct" @change="setCorrect(index)"><span class="w-6 font-semibold">{{ option.label }}.</span><input v-model="option.text" class="field flex-1" :placeholder="`Pilihan ${option.label}`"></div><button type="button" class="text-sm text-emerald-600" @click="addOption">+ Tambah pilihan</button></div><button class="btn mt-3" @click="addManual">Tambah soal</button></section>
    <section v-if="questions.length === 0" class="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">Quiz belum memiliki soal. Tambahkan minimal satu soal sebelum dipublikasikan.</section>
    <section class="space-y-3"><div class="flex items-end justify-between"><div><h2 class="font-semibold">Daftar soal</h2><p class="mt-1 text-sm text-slate-500">Periksa isi, tipe, dan bobot setiap soal.</p></div><span class="text-sm text-slate-500">{{ questions.length }} soal · {{ totalPoints }} poin</span></div><article v-for="(q, i) in questions" :key="q.id" class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"><div class="flex items-start gap-3"><span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-sm font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">{{ i + 1 }}</span><div class="min-w-0 flex-1"><p class="font-medium text-slate-800 dark:text-slate-100">{{ q.question }}</p><div class="mt-2 flex flex-wrap gap-2 text-xs"><span class="rounded-full bg-slate-100 px-2 py-1 text-slate-600 dark:bg-slate-700 dark:text-slate-300">{{ q.type === 'essay' ? 'Essay' : 'Pilihan ganda' }}</span><span class="rounded-full bg-amber-50 px-2 py-1 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">{{ q.points }} poin</span></div></div><button class="text-sm text-red-500 hover:underline" @click="remove(q.id)">Hapus</button></div></article></section>
  </div>

  <!-- Modal Pratinjau Quiz (tampilan seperti siswa) -->
  <Teleport to="body">
    <div v-if="previewOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="closePreview">
      <div class="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-slate-100 shadow-xl dark:bg-slate-900">
        <header class="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3 dark:border-slate-700 dark:bg-slate-800">
          <div class="min-w-0">
            <h2 class="truncate font-bold text-slate-800 dark:text-slate-100">Pratinjau: {{ activity?.title || 'Quiz' }}</h2>
            <p class="text-xs text-slate-500 dark:text-slate-400">Soal {{ previewIndex + 1 }} dari {{ questions.length }} · Mode pratinjau (jawaban tidak disimpan)</p>
          </div>
          <button class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700" @click="closePreview"><Icon name="heroicons:x-mark" class="h-5 w-5" /></button>
        </header>

        <div class="flex flex-1 gap-4 overflow-y-auto p-4">
          <!-- Kartu nomor soal -->
          <aside class="hidden w-52 shrink-0 sm:block">
            <div class="sticky top-0 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
              <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-200">Nomor Soal</h3>
              <div class="mt-3 grid grid-cols-5 gap-2">
                <button
                  v-for="(q, i) in questions" :key="q.id"
                  class="flex h-9 items-center justify-center rounded-lg border text-sm font-semibold transition"
                  :class="i === previewIndex ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300'"
                  @click="previewIndex = i"
                >{{ i + 1 }}</button>
              </div>
            </div>
          </aside>

          <!-- Area soal -->
          <div class="min-w-0 flex-1">
            <article class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div class="mb-4 flex items-center gap-3">
                <span class="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 font-bold text-white">{{ previewIndex + 1 }}</span>
                <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-300">{{ previewQuestion?.points }} poin</span>
              </div>
              <p class="text-base font-medium leading-relaxed text-slate-800 dark:text-slate-100">{{ previewQuestion?.question }}</p>

              <div v-if="previewQuestion?.type === 'multiple_choice'" class="mt-5 grid gap-3">
                <button
                  v-for="(o, oi) in previewQuestion.options" :key="o.id || o.label"
                  class="flex items-center gap-3 rounded-xl border-2 p-4 text-left"
                  :class="o.isCorrect ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30' : 'border-slate-200 dark:border-slate-600'"
                >
                  <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold" :class="o.isCorrect ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300'">{{ o.label || String.fromCharCode(65 + oi) }}</span>
                  <span class="text-sm text-slate-700 dark:text-slate-200">{{ o.text }}</span>
                  <span v-if="o.isCorrect" class="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400"><Icon name="heroicons:check" class="h-4 w-4" /> Kunci</span>
                </button>
              </div>
              <textarea v-else class="field mt-5 h-28 w-full" placeholder="Jawaban siswa (tidak dapat diisi di pratinjau)" disabled />
            </article>

            <div class="mt-4 flex items-center justify-between">
              <button class="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 disabled:opacity-40 dark:border-slate-600 dark:text-slate-300" :disabled="previewIndex === 0" @click="previewIndex--">← Sebelumnya</button>
              <button class="rounded-lg bg-emerald-500 px-5 py-2 text-sm font-semibold text-white disabled:opacity-40" :disabled="previewIndex >= questions.length - 1" @click="previewIndex++">Selanjutnya →</button>
            </div>
          </div>
        </div>

        <footer class="flex justify-end gap-2 border-t border-slate-200 bg-white px-5 py-3 dark:border-slate-700 dark:bg-slate-800">
          <button class="btn-secondary" @click="closePreview">Tutup Pratinjau</button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>
<style scoped>
@reference "~/assets/css/tailwind.css";
.summary-card { @apply rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800; }
.summary-card span { @apply block text-xs font-semibold uppercase tracking-wide text-slate-400; }
.summary-card strong { @apply mt-1 block text-xl font-bold text-slate-800 dark:text-slate-100; }
.summary-card small { @apply text-xs text-slate-500; }.field{ @apply rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800;}.btn{ @apply rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50;}.btn-secondary{ @apply rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700;}</style>
