<script setup lang="ts">
import type { QuizQuestion } from '~/types/quiz'
import { sanitizeHtml } from '~/utils/sanitizeHtml'
const route = useRoute()
const { confirm } = useConfirm()
const courseId = computed(() => String(route.params.id))
const quizId = computed(() => String(route.params.activityId))
const { returnTo } = useCourseReturn(() => `/dashboard/courses/${courseId.value}`)
const { data: takeCourseData } = useFetch<any>(() => `/api/courses/${courseId.value}`, { key: `quiz-take-course-${courseId.value}` })
const { items: breadcrumbItems } = useCourseBreadcrumb({ courseId, activityId: quizId, course: () => takeCourseData.value?.data, leaf: () => ({ label: 'Mengerjakan Quiz' }) })
const takeNav = useActivityNavigation(() => takeCourseData.value?.data, quizId, () => true)
const attemptId = ref('')
const phase = ref<'loading' | 'intro' | 'taking' | 'done'>('loading')
const info = ref<any>(null)
const password = ref('')
const introError = ref('')
const starting = ref(false)
const questions = ref<QuizQuestion[]>([])
const answers = reactive<Record<string, { selectedOptionId?: string; answerText?: string }>>({})
const flagged = ref<string[]>([])
const currentIndex = ref(0)
const expiresAt = ref<number | null>(null)
const remaining = ref('')
const loading = computed(() => phase.value === 'loading')
const message = ref('')
const score = ref<number | null>(null)
const scoreVisibility = ref<'immediate' | 'after_close' | 'never'>('immediate')
const examMode = ref(false)
const fullscreenMode = ref(false)
const fullscreenWarning = ref('')
const tabSwitches = ref(0)
const saveState = ref<'idle' | 'saving' | 'saved' | 'error'>('idle')
const result = ref<any>(null)
const resultMessage = computed(() => result.value?.autoSubmitted ? 'Waktu habis. Jawaban dikirim otomatis.' : 'Jawaban berhasil dikirim.')
const review = ref<{ questions: QuizQuestion[]; answers: any[] } | null>(null)
const reviewOpen = ref(false)
const reviewLoading = ref(false)
const canReview = computed(() => info.value?.reviewMode !== 'never' && (info.value?.reviewMode !== 'after_close' || (!!info.value?.closeAt && Date.now() >= new Date(info.value.closeAt).getTime())))
const reviewButtonLabel = computed(() => reviewOpen.value ? 'Tutup Review Jawaban' : 'Review Jawaban')
async function toggleReview() {
  if (!canReview.value || reviewLoading.value) return
  if (!review.value) {
    reviewLoading.value = true
    try {
      if (!result.value?.id) return
      const response = await $fetch<{ data: { questions: QuizQuestion[]; answers: any[] } }>(`/api/courses/${courseId.value}/quizzes/${quizId.value}/attempts/${result.value.id}`)
      review.value = { questions: response.data.questions, answers: response.data.answers }
    } finally { reviewLoading.value = false }
  }
  reviewOpen.value = !reviewOpen.value
}
const reviewItems = computed(() => {
  if (!review.value) return []
  return review.value.questions.map((q, index) => {
    const answer = review.value!.answers.find((a) => a.quizQuestionId === q.id)
    const selected = q.options.find((o) => o.id === answer?.selectedOptionId)
    const correctOption = q.options.find((o) => o.isCorrect)
    const isCorrect = q.type === 'multiple_choice' && !!selected?.isCorrect
    return { index: index + 1, question: q, selected, correctOption, isCorrect, answerText: answer?.answerText ?? null }
  })
})
const canRetake = computed(() => !info.value?.hasActiveAttempt && (info.value?.attemptsLeft == null || info.value.attemptsLeft > 0))
const formatDate = (value: string | Date | null) => value ? new Date(value).toLocaleString('id-ID') : '-'
const formatDuration = (seconds: number | null) => seconds == null ? '-' : `${Math.floor(seconds / 60)} menit ${seconds % 60} detik`
let timer: ReturnType<typeof setInterval> | undefined
let saveTimer: ReturnType<typeof setTimeout> | undefined
let loaded = false

// ---------- Navigasi & status soal ----------
const current = computed(() => questions.value[currentIndex.value])
const total = computed(() => questions.value.length)
const isLast = computed(() => currentIndex.value >= total.value - 1)
const isFirst = computed(() => currentIndex.value === 0)

function isAnswered(id: string) {
  const a = answers[id]
  return !!a && (!!a.selectedOptionId || !!a.answerText?.trim())
}
const answeredCount = computed(() => questions.value.filter((q) => isAnswered(q.id)).length)
const doubtfulCount = computed(() => flagged.value.length)
const unansweredNumbers = computed(() =>
  questions.value.map((q, i) => (isAnswered(q.id) ? 0 : i + 1)).filter((n) => n > 0),
)

function isFlagged(id: string) { return flagged.value.includes(id) }
function toggleFlag() {
  const id = current.value?.id
  if (!id) return
  flagged.value = isFlagged(id) ? flagged.value.filter((x) => x !== id) : [...flagged.value, id]
}

function goTo(index: number) {
  if (index < 0 || index >= total.value) return
  void saveNow()
  currentIndex.value = index
  if (import.meta.client) window.scrollTo({ top: 0, behavior: 'smooth' })
}
function next() { if (!isLast.value) goTo(currentIndex.value + 1) }
function prev() { if (!isFirst.value) goTo(currentIndex.value - 1) }

function selectOption(questionId: string, optionId?: string) {
  if (!answers[questionId]) answers[questionId] = {}
  answers[questionId].selectedOptionId = optionId
}

// ---------- Simpan otomatis ----------
function payload() {
  return questions.value.map((q) => ({
    questionId: q.id,
    selectedOptionId: answers[q.id]?.selectedOptionId ?? null,
    answerText: answers[q.id]?.answerText ?? null,
  }))
}
function scheduleSave() {
  if (!loaded || !attemptId.value) return
  clearTimeout(saveTimer)
  saveState.value = 'idle'
  saveTimer = setTimeout(() => void saveNow(), 1500)
}
async function saveNow() {
  if (!attemptId.value) return
  clearTimeout(saveTimer)
  saveState.value = 'saving'
  try {
    await $fetch(`/api/courses/${courseId.value}/quizzes/${quizId.value}/attempts/save`, {
      method: 'POST',
      body: { attemptId: attemptId.value, answers: payload() },
    })
    saveState.value = 'saved'
  } catch {
    saveState.value = 'error'
  }
}
watch(answers, scheduleSave, { deep: true })

// ---------- Exam guards ----------
async function logEvent(type: 'tab_switch' | 'copy' | 'paste' | 'cut' | 'context_menu' | 'focus_lost', detail?: string) {
  if (!examMode.value || !attemptId.value) return
  try {
    await $fetch(`/api/courses/${courseId.value}/quizzes/${quizId.value}/attempts/event`, {
      method: 'POST', body: { attemptId: attemptId.value, type, detail },
    })
  } catch { /* audit failure must not block quiz */ }
}
function blockClipboard(event: Event) {
  if (examMode.value) {
    event.preventDefault()
    const type = event.type === 'contextmenu' ? 'context_menu' : event.type as 'copy' | 'cut' | 'paste'
    void logEvent(type)
  }
}
function detectTabSwitch() {
  if (examMode.value && document.hidden) {
    tabSwitches.value++
    void logEvent('tab_switch')
  }
}
function installExamGuards() {
  if (!examMode.value) return
  document.addEventListener('copy', blockClipboard)
  document.addEventListener('cut', blockClipboard)
  document.addEventListener('paste', blockClipboard)
  document.addEventListener('contextmenu', blockClipboard)
  document.addEventListener('visibilitychange', detectTabSwitch)
}
function removeExamGuards() {
  document.removeEventListener('copy', blockClipboard)
  document.removeEventListener('cut', blockClipboard)
  document.removeEventListener('paste', blockClipboard)
  document.removeEventListener('contextmenu', blockClipboard)
  document.removeEventListener('visibilitychange', detectTabSwitch)
}

// ---------- Timer ----------
function tick() {
  if (!expiresAt.value) return
  const seconds = Math.max(0, Math.floor((expiresAt.value - Date.now()) / 1000))
  remaining.value = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
  if (!seconds) { clearInterval(timer); void submit(true) }
}

// ---------- Muat info, mulai, kirim ----------
async function loadInfo() {
  try {
    const res = await $fetch<{ data: any }>(`/api/courses/${courseId.value}/quizzes/${quizId.value}/info`)
    info.value = res.data; fullscreenMode.value = !!res.data.fullscreenMode; examMode.value = !!res.data.examMode
    result.value = res.data.latestAttempt
    if (res.data.hasActiveAttempt) phase.value = 'intro'
    else if (res.data.latestAttempt) phase.value = 'done'
    else phase.value = 'intro'
  } catch (e: any) { phase.value = 'done'; message.value = e?.data?.statusMessage || 'Quiz tidak dapat dibuka' }
}
async function requestFullscreen() { try { if (!document.fullscreenElement) await document.documentElement.requestFullscreen(); fullscreenWarning.value = '' } catch { fullscreenWarning.value = 'Browser menolak mode layar penuh.' } }
async function exitFullscreen() { try { if (document.fullscreenElement) await document.exitFullscreen() } catch { /* ignore */ } }
async function beginQuiz() {
  if (starting.value) return
  introError.value = ''; starting.value = true
  if (fullscreenMode.value) await requestFullscreen()
  try { await load(); phase.value = 'taking' }
  catch (e: any) { introError.value = e?.data?.statusMessage || 'Quiz tidak dapat dibuka'; await exitFullscreen() }
  finally { starting.value = false }
}
function onFullscreenChange() { if (phase.value === 'taking' && fullscreenMode.value && !document.fullscreenElement) fullscreenWarning.value = 'Kamu keluar dari mode layar penuh.' }
async function load() {
  const startedResponse = await $fetch<{ data: { attemptId: string } }>(`/api/courses/${courseId.value}/quizzes/${quizId.value}/attempts/start`, { method: 'POST', body: { password: password.value || undefined } })
  attemptId.value = startedResponse.data.attemptId
  const detail = await $fetch<{ data: { attempt: any; questions: QuizQuestion[]; answers: any[] } }>(`/api/courses/${courseId.value}/quizzes/${quizId.value}/attempts/${attemptId.value}`)
  questions.value = detail.data.questions
  for (const question of questions.value) answers[question.id] = {}
  for (const answer of detail.data.answers) answers[answer.quizQuestionId] = { selectedOptionId: answer.selectedOptionId ?? undefined, answerText: answer.answerText ?? undefined }
  expiresAt.value = detail.data.attempt.expiresAt ? new Date(detail.data.attempt.expiresAt).getTime() : null
  examMode.value = !!detail.data.attempt.examMode
  installExamGuards()
  tick(); if (expiresAt.value) timer = setInterval(tick, 1000)
  loaded = true
}
async function submit(auto = false) {
  if (!auto) {
    const missing = unansweredNumbers.value
    const warn = missing.length
      ? `Masih ada ${missing.length} soal belum dijawab (nomor ${missing.join(', ')}).\n\n`
      : ''
    if (!await confirm({ title: 'Kirim jawaban?', message: `${warn}Jawaban tidak dapat diubah setelah dikirim.`, confirmLabel: 'Kirim jawaban' })) return
  }
  clearInterval(timer)
  clearTimeout(saveTimer)
  removeExamGuards()
  await exitFullscreen()
  try {
    const submitResult = await $fetch<{ score: number | null; showScore: boolean; scoreVisibility: 'immediate' | 'after_close' | 'never' }>(`/api/courses/${courseId.value}/quizzes/${quizId.value}/attempts/submit`, { method: 'POST', body: { attemptId: attemptId.value, answers: payload() } })
    score.value = submitResult.showScore ? submitResult.score : null
    scoreVisibility.value = submitResult.scoreVisibility
    message.value = auto ? 'Waktu habis. Jawaban dikirim otomatis.' : 'Jawaban berhasil dikirim.'
    const refreshed = await $fetch<{ data: any }>(`/api/courses/${courseId.value}/quizzes/${quizId.value}/info`)
    info.value = refreshed.data
    result.value = refreshed.data.latestAttempt
  } catch (e: any) {
    message.value = e?.data?.statusMessage || 'Gagal mengirim jawaban.'
  } finally {
    phase.value = 'done'
  }
}

function onKeydown(e: KeyboardEvent) {
  const target = e.target as HTMLElement | null
  if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return
  if (e.key === 'ArrowRight') next()
  else if (e.key === 'ArrowLeft') prev()
  else if (/^[1-9]$/.test(e.key) && current.value?.type === 'multiple_choice') {
    const option = current.value.options[Number(e.key) - 1]
    if (option) selectOption(current.value.id, option.id)
  }
}

onMounted(() => {
  document.addEventListener('fullscreenchange', onFullscreenChange)
  window.addEventListener('keydown', onKeydown)
  void loadInfo()
})
onBeforeUnmount(() => {
  void exitFullscreen()
  clearInterval(timer)
  clearTimeout(saveTimer)
  removeExamGuards()
  document.removeEventListener('fullscreenchange', onFullscreenChange)
  window.removeEventListener('keydown', onKeydown)
})

const saveLabel = computed(() => ({
  idle: 'Tersimpan otomatis',
  saving: 'Menyimpan…',
  saved: 'Tersimpan',
  error: 'Gagal menyimpan',
}[saveState.value]))
</script>

<template>
  <div class="min-h-screen flex flex-col" :class="examMode ? 'select-none' : ''">
    <!-- Header (hanya saat mengerjakan) -->
    <header v-if="phase === 'taking'" class="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
      <div class="min-w-0">
        <h1 class="truncate font-bold text-slate-800 dark:text-slate-100">Kerjakan Quiz</h1>
        <p class="text-xs text-slate-500 dark:text-slate-400">Soal {{ Math.min(currentIndex + 1, total) }} dari {{ total }}</p>
      </div>
      <div class="flex items-center gap-3">
        <span v-if="expiresAt" class="rounded-lg bg-red-50 px-3 py-1 font-mono text-sm font-bold text-red-600 dark:bg-red-900/30 dark:text-red-300">{{ remaining }}</span>
        <span class="hidden text-xs text-slate-400 sm:inline">{{ saveLabel }}</span>
        <button class="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800" @click="saveNow">Simpan</button>
      </div>
    </header>

    <div v-if="phase === 'loading'" class="flex-1 p-6 text-center text-slate-500 dark:text-slate-400">Memuat quiz...</div>

    <!-- Layar informasi & konfirmasi sebelum mengerjakan -->
    <div v-else-if="phase === 'intro'" class="flex flex-1 items-center justify-center p-4">
      <div class="w-full max-w-2xl space-y-4">
        <AppBreadcrumb :back-to="returnTo" :items="breadcrumbItems" />
        <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <p class="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">Sebelum Mengerjakan</p>
          <h1 class="mt-1 text-xl font-bold text-slate-800 dark:text-slate-100">{{ info?.title || 'Quiz' }}</h1>
          <div v-if="info?.content" class="mt-2 rich-content min-w-0 max-w-full overflow-hidden text-sm text-slate-600 dark:text-slate-300" v-html="sanitizeHtml(info.content)" />

          <!-- Ringkasan aturan umum -->
          <dl class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div class="rounded-xl bg-slate-50 p-3 dark:bg-slate-700/40">
              <dt class="text-[11px] font-medium uppercase tracking-wide text-slate-400">Jumlah Soal</dt>
              <dd class="mt-0.5 text-lg font-bold text-slate-800 dark:text-slate-100">{{ info?.questionCount ?? 0 }}</dd>
            </div>
            <div class="rounded-xl bg-slate-50 p-3 dark:bg-slate-700/40">
              <dt class="text-[11px] font-medium uppercase tracking-wide text-slate-400">Waktu</dt>
              <dd class="mt-0.5 text-lg font-bold text-slate-800 dark:text-slate-100">{{ info?.durationMinutes ? `${info.durationMinutes} menit` : 'Tanpa batas' }}</dd>
            </div>
            <div class="rounded-xl bg-slate-50 p-3 dark:bg-slate-700/40">
              <dt class="text-[11px] font-medium uppercase tracking-wide text-slate-400">Nilai Maksimum</dt>
              <dd class="mt-0.5 text-lg font-bold text-slate-800 dark:text-slate-100">{{ info?.maxPoint ?? 100 }}</dd>
            </div>
            <div class="rounded-xl bg-slate-50 p-3 dark:bg-slate-700/40">
              <dt class="text-[11px] font-medium uppercase tracking-wide text-slate-400">Percobaan</dt>
              <dd class="mt-0.5 text-sm font-bold text-slate-800 dark:text-slate-100">{{ info?.maxAttempts == null ? 'Tanpa batas' : `${info?.attemptsLeft ?? 0} dari ${info.maxAttempts} tersisa` }}</dd>
            </div>
            <div class="rounded-xl bg-slate-50 p-3 dark:bg-slate-700/40">
              <dt class="text-[11px] font-medium uppercase tracking-wide text-slate-400">Tampilkan Nilai</dt>
              <dd class="mt-0.5 text-sm font-bold text-slate-800 dark:text-slate-100">{{ info?.scoreVisibility === 'never' ? 'Tidak ditampilkan' : info?.scoreVisibility === 'after_close' ? 'Setelah quiz ditutup' : 'Setelah mengerjakan' }}</dd>
            </div>
            <div class="rounded-xl bg-slate-50 p-3 dark:bg-slate-700/40">
              <dt class="text-[11px] font-medium uppercase tracking-wide text-slate-400">Mode</dt>
              <dd class="mt-0.5 text-sm font-bold text-slate-800 dark:text-slate-100">{{ info?.examMode ? 'Ujian (exam)' : 'Normal' }}</dd>
            </div>
          </dl>

          <div v-if="info?.instructions" class="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
            <p class="mb-2 font-semibold">Instruksi Guru</p>
            <div class="rich-content min-w-0 max-w-full overflow-hidden" v-html="sanitizeHtml(info.instructions)" />
          </div>

          <!-- Aturan pengerjaan umum -->
          <div class="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
            <p class="mb-2 font-semibold">Aturan Pengerjaan</p>
            <ul class="list-disc space-y-1 pl-5">
              <li>Jawaban tersimpan otomatis; kamu boleh berpindah nomor soal kapan saja.</li>
              <li v-if="info?.durationMinutes">Waktu mulai berjalan begitu kamu menekan "Mulai". Saat waktu habis, jawaban dikirim otomatis.</li>
              <li v-else>Quiz ini tanpa batas waktu, namun tetap kerjakan dengan jujur dan mandiri.</li>
              <li v-if="info?.maxAttempts != null">Kesempatan mengerjakan dibatasi {{ info.maxAttempts }} kali. Pastikan jawabanmu sudah benar sebelum mengirim.</li>
              <li v-if="info?.examMode">Exam mode aktif: <strong>copy, paste, dan klik kanan dinonaktifkan</strong>, serta perpindahan tab dicatat.</li>
              <li v-if="info?.fullscreenMode">Ujian berjalan dalam <strong>mode layar penuh</strong>. Jangan keluar dari layar penuh sampai selesai.</li>
              <li>Nilai ditampilkan {{ info?.scoreVisibility === 'never' ? 'tidak akan ditampilkan' : info?.scoreVisibility === 'after_close' ? 'setelah quiz ditutup' : 'langsung setelah kamu mengirim jawaban' }}.</li>
              <li v-if="info?.reviewMode !== 'never'">Review jawaban benar/salah {{ info?.reviewMode === 'after_close' ? 'tersedia setelah quiz ditutup' : 'tersedia setelah kamu mengirim jawaban' }}.</li>
              <li v-else>Review jawaban benar/salah tidak ditampilkan untuk quiz ini.</li>
            </ul>
          </div>

          <!-- Kata sandi -->
          <div v-if="info?.hasPassword" class="mt-4">
            <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Kata Sandi Quiz <span class="text-red-500">*</span></label>
            <input v-model="password" type="password" placeholder="Masukkan kata sandi dari guru" class="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200" @keydown.enter.prevent="beginQuiz">
            <p class="mt-1 text-xs text-slate-400">Quiz ini dilindungi kata sandi. Hubungi guru jika kamu belum menerimanya.</p>
          </div>

          <p v-if="introError" class="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">{{ introError }}</p>

          <div class="mt-5 flex items-center justify-end gap-2">
            <NuxtLink :to="returnTo" class="inline-flex h-11 items-center rounded-lg px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700">Batal</NuxtLink>
            <button class="h-10 rounded-lg bg-emerald-500 px-5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50" :disabled="starting || (info?.hasPassword && !password)" @click="beginQuiz">
              {{ starting ? 'Menyiapkan...' : (info?.hasActiveAttempt ? 'Lanjutkan Mengerjakan' : 'Mulai Mengerjakan') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="phase === 'done'" class="min-h-screen w-full bg-slate-100 px-4 py-6 dark:bg-slate-950 sm:px-6">
      <div class="mx-auto w-full max-w-6xl space-y-4">
        <AppBreadcrumb :back-to="returnTo" :items="breadcrumbItems" />
        <section class="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm dark:border-emerald-800 dark:bg-slate-800">
          <p class="text-xs font-semibold uppercase tracking-wide text-emerald-600">Hasil Ujian</p>
          <h1 class="mt-1 text-xl font-bold text-slate-800 dark:text-slate-100">{{ info?.title || 'Quiz' }}</h1>
          <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">{{ message || 'Ujian telah selesai.' }}</p>
          <div v-if="result?.score != null" class="mt-5 rounded-xl bg-emerald-50 p-5 text-center dark:bg-emerald-900/30">
            <p class="text-xs font-medium uppercase tracking-wide text-emerald-600">Nilai</p>
            <p class="text-4xl font-bold text-emerald-700 dark:text-emerald-300">{{ result.score }} / {{ info?.maxPoint }}</p>
          </div>
          <div v-else class="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-700/40 dark:text-slate-300">
            {{ info?.scoreVisibility === 'after_close' ? 'Nilai akan ditampilkan setelah ujian ditutup.' : 'Nilai tidak ditampilkan untuk ujian ini.' }}
          </div>
          <dl class="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div class="rounded-lg bg-slate-50 p-3 dark:bg-slate-700/40"><dt class="text-xs text-slate-400">Percobaan</dt><dd class="font-semibold">Ke-{{ result?.attemptNumber }}</dd></div>
            <div class="rounded-lg bg-slate-50 p-3 dark:bg-slate-700/40"><dt class="text-xs text-slate-400">Mulai</dt><dd class="font-semibold">{{ formatDate(result?.startedAt) }}</dd></div>
            <div class="rounded-lg bg-slate-50 p-3 dark:bg-slate-700/40"><dt class="text-xs text-slate-400">Submit</dt><dd class="font-semibold">{{ formatDate(result?.submittedAt) }}</dd></div>
            <div class="rounded-lg bg-slate-50 p-3 dark:bg-slate-700/40"><dt class="text-xs text-slate-400">Durasi</dt><dd class="font-semibold">{{ formatDuration(result?.durationSeconds) }}</dd></div>
            <div class="rounded-lg bg-slate-50 p-3 dark:bg-slate-700/40"><dt class="text-xs text-slate-400">Jawaban</dt><dd class="font-semibold">{{ result?.answeredCount }}/{{ result?.totalQuestions }}</dd></div>
            <div class="rounded-lg bg-slate-50 p-3 dark:bg-slate-700/40"><dt class="text-xs text-slate-400">Pelanggaran</dt><dd class="font-semibold">{{ result?.violationCount ?? result?.violations?.total ?? 0 }} kali</dd></div>
          </dl>
          <div class="mt-5 flex flex-wrap justify-end gap-2">
            <button v-if="canReview" :disabled="reviewLoading" class="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" :class="reviewOpen ? 'bg-slate-600 hover:bg-slate-700' : 'bg-indigo-600 hover:bg-indigo-700'" @click="toggleReview">
              <Icon :name="reviewOpen ? 'heroicons:eye-slash' : 'heroicons:eye'" class="h-4 w-4" /> {{ reviewLoading ? 'Memuat...' : reviewButtonLabel }}
            </button>
            <button v-if="canRetake" class="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600" @click="phase = 'intro'">Kerjakan Ujian</button>
            <NuxtLink :to="returnTo" class="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"><Icon name="heroicons:arrow-left" class="h-5 w-5" /> Kembali</NuxtLink>
          </div>
        </section>

        <section v-if="canReview && reviewOpen && reviewItems.length" class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h2 class="text-sm font-bold text-slate-800 dark:text-slate-100">Review Jawaban</h2>
          <p class="mt-1 text-xs text-slate-400">Pembahasan jawaban untuk keperluan pembelajaran.</p>
          <div class="mt-4 space-y-4">
            <article v-for="item in reviewItems" :key="item.question.id" class="rounded-xl border p-4" :class="item.isCorrect ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-900/10' : 'border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-900/10'">
              <div class="mb-2 flex items-center gap-2">
                <span class="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white" :class="item.isCorrect ? 'bg-emerald-500' : 'bg-red-500'">{{ item.index }}</span>
                <span class="text-xs font-semibold" :class="item.isCorrect ? 'text-emerald-600' : 'text-red-600'">{{ item.question.type === 'essay' ? 'Menunggu penilaian' : item.isCorrect ? 'Benar' : 'Salah' }}</span>
              </div>
              <p class="text-sm font-medium text-slate-800 dark:text-slate-100">{{ item.question.question }}</p>
              <div v-if="item.question.type === 'multiple_choice'" class="mt-3 space-y-1.5 text-sm">
                <p v-if="item.correctOption" class="text-emerald-700 dark:text-emerald-300">Jawaban benar: <strong>{{ item.correctOption.label }}. {{ item.correctOption.text }}</strong></p>
                <p class="text-slate-600 dark:text-slate-300">Jawaban kamu: <strong>{{ item.selected ? `${item.selected.label}. ${item.selected.text}` : 'Tidak dijawab' }}</strong></p>
              </div>
              <p v-else class="mt-3 text-sm text-slate-600 dark:text-slate-300">Jawaban kamu: {{ item.answerText || 'Tidak dijawab' }}</p>
              <p v-if="item.question.explanation" class="mt-3 rounded-lg bg-white/70 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300"><strong>Pembahasan:</strong> {{ item.question.explanation }}</p>
            </article>
          </div>
        </section>

        <p v-if="info?.reviewMode === 'after_close' && !canReview" class="rounded-lg bg-amber-50 px-4 py-2 text-center text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">Review akan tersedia setelah quiz ditutup.</p>
        <p v-else-if="info?.reviewMode === 'never'" class="rounded-lg bg-slate-100 px-4 py-2 text-center text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">Review jawaban dinonaktifkan oleh guru untuk quiz ini.</p>
        <ActivityNavigation :previous="takeNav.previous.value" :next="takeNav.next.value" :link="takeNav.link" class="pt-2" />
      </div>
    </div>

    <template v-else-if="phase === 'taking' && total">
      <p v-if="fullscreenWarning" class="mx-auto mt-3 max-w-6xl rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">{{ fullscreenWarning }} <button class="font-semibold underline" @click="requestFullscreen">Masuk layar penuh</button></p>
      <div class="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 p-4 lg:flex-row">
        <!-- Kartu nomor soal (desktop) -->
        <aside class="hidden lg:block lg:w-64 lg:shrink-0">
          <div class="sticky top-20 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <h2 class="text-sm font-semibold text-slate-700 dark:text-slate-200">Nomor Soal</h2>
            <p class="mb-3 text-xs text-slate-400">{{ answeredCount }}/{{ total }} terjawab</p>
            <div class="grid grid-cols-5 gap-2">
              <button
                v-for="(q, i) in questions"
                :key="q.id"
                class="flex h-10 items-center justify-center rounded-lg border text-sm font-semibold transition"
                :class="[
                  i === currentIndex ? 'border-emerald-500 ring-2 ring-emerald-500/40' : 'border-slate-200 dark:border-slate-600',
                  isFlagged(q.id) ? 'bg-amber-400 text-white'
                    : isAnswered(q.id) ? 'bg-emerald-500 text-white'
                    : 'bg-white text-slate-500 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700',
                ]"
                @click="goTo(i)"
              >{{ i + 1 }}</button>
            </div>
            <div class="mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
              <div class="flex items-center gap-2"><span class="h-3 w-3 rounded bg-emerald-500"></span> Terjawab</div>
              <div class="flex items-center gap-2"><span class="h-3 w-3 rounded bg-amber-400"></span> Ragu-ragu</div>
              <div class="flex items-center gap-2"><span class="h-3 w-3 rounded border border-slate-300 bg-white dark:border-slate-500 dark:bg-slate-700"></span> Belum dijawab</div>
            </div>
          </div>
        </aside>

        <!-- Area soal -->
        <section class="min-w-0 flex-1">
          <!-- Strip nomor soal (mobile) -->
          <div class="sticky top-14 z-10 -mx-4 mb-4 overflow-x-auto border-b border-slate-200 bg-white/95 px-4 py-2 backdrop-blur lg:hidden dark:border-slate-700 dark:bg-slate-900/95">
            <div class="flex gap-2">
              <button
                v-for="(q, i) in questions"
                :key="q.id"
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-sm font-semibold"
                :class="[
                  i === currentIndex ? 'border-emerald-500 ring-2 ring-emerald-500/40' : 'border-slate-200 dark:border-slate-600',
                  isFlagged(q.id) ? 'bg-amber-400 text-white'
                    : isAnswered(q.id) ? 'bg-emerald-500 text-white'
                    : 'bg-white text-slate-500 dark:bg-slate-800 dark:text-slate-300',
                ]"
                @click="goTo(i)"
              >{{ i + 1 }}</button>
            </div>
          </div>

          <p v-if="examMode" class="mb-4 rounded-lg bg-amber-50 px-4 py-2 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
            Exam mode aktif: copy/paste dinonaktifkan. Pindah tab terdeteksi ({{ tabSwitches }}x) dan tercatat.
          </p>

          <!-- Soal -->
          <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:p-7 dark:border-slate-700 dark:bg-slate-800">
            <div class="mb-4 flex items-start justify-between gap-3">
              <div class="flex items-center gap-3">
                <span class="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 font-bold text-white">{{ currentIndex + 1 }}</span>
                <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-300">{{ current?.points }} poin</span>
              </div>
              <button
                class="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium"
                :class="isFlagged(current?.id || '') ? 'border-amber-400 bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300' : 'border-slate-200 text-slate-500 dark:border-slate-600 dark:text-slate-300'"
                @click="toggleFlag"
              ><span>⚑</span> {{ isFlagged(current?.id || '') ? 'Ditandai' : 'Ragu-ragu' }}</button>
            </div>

            <p class="text-base leading-relaxed font-medium text-slate-800 lg:text-lg dark:text-slate-100">{{ current?.question }}</p>

            <!-- Pilihan ganda: tombol kotak -->
            <div v-if="current?.type === 'multiple_choice'" class="mt-5 grid gap-3">
              <button
                v-for="(o, oi) in current.options"
                :key="o.id || o.label"
                class="flex items-center gap-3 rounded-xl border-2 p-4 text-left transition"
                :class="answers[current.id]?.selectedOptionId === o.id
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30'
                  : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:hover:border-emerald-500'"
                @click="selectOption(current.id, o.id)"
              >
                <span
                  class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold"
                  :class="answers[current.id]?.selectedOptionId === o.id ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300'"
                >{{ o.label || String.fromCharCode(65 + oi) }}</span>
                <span class="text-sm text-slate-700 lg:text-base dark:text-slate-200">{{ o.text }}</span>
              </button>
            </div>

            <!-- Essay -->
            <textarea
              v-else
              v-model="answers[current!.id]!.answerText"
              class="field mt-5 h-40"
              placeholder="Tulis jawaban..."
            />
          </article>

          <!-- Navigasi -->
          <div class="mt-4 flex items-center justify-between gap-3">
            <button
              class="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 disabled:opacity-40 dark:border-slate-600 dark:text-slate-300"
              :disabled="isFirst"
              @click="prev"
            >← Sebelumnya</button>

            <button
              v-if="!isLast"
              class="rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600"
              @click="next"
            >Selanjutnya →</button>
            <button
              v-else
              class="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
              @click="submit()"
            >Kirim Quiz</button>
          </div>

          <!-- Ringkasan bawah -->
          <div class="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-white px-4 py-3 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <span>{{ answeredCount }}/{{ total }} terjawab</span>
            <span v-if="doubtfulCount">• {{ doubtfulCount }} ragu-ragu</span>
            <span v-if="unansweredNumbers.length">• Belum dijawab: {{ unansweredNumbers.join(', ') }}</span>
            <button class="ml-auto font-semibold text-emerald-600 hover:underline" @click="submit()">Kirim semua jawaban</button>
          </div>
        </section>
      </div>
    </template>

    <div v-else-if="phase === 'taking'" class="flex-1 p-6 text-center text-slate-500 dark:text-slate-400">
      Belum ada soal pada quiz ini.
      <NuxtLink :to="returnTo" class="ml-1 underline">Kembali</NuxtLink>
    </div>
  </div>
</template>

<style scoped>
@reference "~/assets/css/tailwind.css";
.field { @apply w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200; }
</style>
