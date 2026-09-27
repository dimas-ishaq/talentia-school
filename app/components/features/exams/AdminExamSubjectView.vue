<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any -- nested exam/question API payload. */
const route = useRoute()
const { confirm } = useConfirm()
const eventId = computed(() => String(route.params.id)); const subjectId = computed(() => String(route.params.subjectId))
const { data: eventData } = await useFetch<any>(() => `/api/exam-events/${eventId.value}`)
const subject = computed(() => eventData.value?.data?.subjects?.find((s: any) => s.id === subjectId.value))
const { data: qData, refresh } = await useFetch<any>(() => `/api/exam-events/${eventId.value}/subjects/${subjectId.value}/questions`)
const questions = computed(() => qData.value?.data ?? [])
const { data: packagesData } = await useFetch<any>('/api/question-packages')
const packages = computed(() => packagesData.value?.data ?? [])
const selectedPackage = ref(''); const selectedBank = ref<string[]>([]); const bank = ref<any[]>([]); const saving = ref(false); const errorMessage = ref('')
async function loadPackage() { bank.value = []; selectedBank.value = []; if (!selectedPackage.value) return; const r = await $fetch<any>(`/api/question-packages/${selectedPackage.value}`); bank.value = (r.data.questions ?? []).filter((q: any) => q.isActive) }
watch(selectedPackage, loadPackage)
const allSelected = computed(() => bank.value.length > 0 && selectedBank.value.length === bank.value.length)
function toggleAll() { selectedBank.value = allSelected.value ? [] : bank.value.map((q) => q.id) }
async function addQuestions() { saving.value = true; errorMessage.value = ''; try { const body = selectedBank.value.length ? { questions: selectedBank.value.map((bankQuestionId) => ({ bankQuestionId })) } : { packageId: selectedPackage.value }; await $fetch(`/api/exam-events/${eventId.value}/subjects/${subjectId.value}/questions`, { method: 'POST', body }); selectedBank.value = []; await refresh() } catch (e: any) { errorMessage.value = e?.data?.statusMessage || 'Gagal menambahkan soal' } finally { saving.value = false } }
const manual = reactive({ type: 'essay' as 'essay' | 'multiple_choice', question: '', points: 1, options: Array.from({ length: 4 }, (_, i) => ({ label: String.fromCharCode(65 + i), text: '', isCorrect: i === 0 })) })
function setCorrect(i: number) { manual.options.forEach((o, n) => { o.isCorrect = i === n }) }
async function addManual() { if (!manual.question.trim()) return; await $fetch(`/api/exam-events/${eventId.value}/subjects/${subjectId.value}/questions`, { method: 'POST', body: { questions: [{ type: manual.type, question: manual.question, points: Number(manual.points), options: manual.type === 'multiple_choice' ? manual.options : [] }] } }); manual.question = ''; await refresh() }
async function removeQuestion(id: string) { if (!await confirm({ title: 'Hapus soal?', message: 'Hapus soal ini?', confirmLabel: 'Ya, hapus', tone: 'danger' })) return; await $fetch(`/api/exam-events/${eventId.value}/subjects/${subjectId.value}/questions/${id}`, { method: 'DELETE' }); await refresh() }

const stats = computed(() => {
  const multiple = questions.value.filter((q: any) => q.type !== 'essay').length
  return [
    { label: 'Total Soal', value: questions.value.length, icon: 'heroicons:document-text', tone: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-400/10 dark:text-emerald-300' },
    { label: 'Pilihan Ganda', value: multiple, icon: 'heroicons:list-bullet', tone: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-400/10 dark:text-indigo-300' },
    { label: 'Essay', value: questions.value.length - multiple, icon: 'heroicons:pencil-square', tone: 'text-violet-600 bg-violet-50 dark:bg-violet-400/10 dark:text-violet-300' },
    { label: 'Total Poin', value: questions.value.reduce((s: number, q: any) => s + (q.points ?? 0), 0), icon: 'heroicons:star', tone: 'text-amber-600 bg-amber-50 dark:bg-amber-400/10 dark:text-amber-300' },
  ]
})
</script>

<template>
  <div class="mx-auto max-w-6xl space-y-6 pb-8">
    <NuxtLink :to="`/dashboard/exams/${eventId}`" class="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
      <Icon name="heroicons:arrow-left" class="h-4 w-4" /> Kembali ke event
    </NuxtLink>

    <!-- ============ HEADER ============ -->
    <section class="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-8">
      <div class="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />
      <div class="relative max-w-2xl">
        <div class="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-400/10 dark:text-emerald-300">
          <Icon name="heroicons:document-text" class="h-4 w-4" /> Kelola Soal
        </div>
        <h1 class="mt-4 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{{ subject?.subject?.name || 'Mapel' }}</h1>
        <p class="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{{ subject?.durationMinutes }} menit · KKM {{ subject?.passingGrade }} · Maks {{ subject?.maxAttempts }} percobaan</p>
      </div>

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

    <p v-if="errorMessage" class="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
      <Icon name="heroicons:exclamation-circle" class="h-4 w-4 shrink-0" /> {{ errorMessage }}
    </p>

    <!-- ============ AMBIL DARI BANK SOAL ============ -->
    <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div class="flex items-center gap-3">
        <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-300"><Icon name="heroicons:archive-box" class="h-5 w-5" /></span>
        <div>
          <h2 class="font-semibold text-slate-800 dark:text-slate-100">Ambil dari Bank Soal</h2>
          <p class="text-xs text-slate-500 dark:text-slate-400">Pilih paket lalu centang soal yang ingin dipakai.</p>
        </div>
      </div>
      <select v-model="selectedPackage" class="field mt-4">
        <option value="">Pilih paket soal</option>
        <option v-for="p in packages" :key="p.id" :value="p.id">{{ p.name }} ({{ p.questionCount || 0 }} soal)</option>
      </select>
      <template v-if="selectedPackage && bank.length">
        <label class="mt-4 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          <input type="checkbox" class="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" :checked="allSelected" @change="toggleAll"> Pilih semua ({{ bank.length }})
        </label>
        <div class="mt-3 max-h-56 space-y-2 overflow-y-auto rounded-xl border border-slate-100 p-3 dark:border-slate-700">
          <label v-for="q in bank" :key="q.id" class="flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/50">
            <input v-model="selectedBank" type="checkbox" :value="q.id" class="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500">
            <span>{{ q.question }}</span>
          </label>
        </div>
        <button class="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50" :disabled="saving" @click="addQuestions">
          <Icon v-if="saving" name="heroicons:arrow-path" class="h-4 w-4 animate-spin" />
          {{ selectedBank.length ? `Tambahkan ${selectedBank.length} soal` : 'Tambahkan semua soal' }}
        </button>
      </template>
      <p v-else-if="selectedPackage" class="mt-3 text-sm text-slate-500 dark:text-slate-400">Paket belum memiliki soal aktif.</p>
    </section>

    <!-- ============ TAMBAH MANUAL ============ -->
    <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div class="flex items-center gap-3">
        <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-400/10 dark:text-violet-300"><Icon name="heroicons:pencil-square" class="h-5 w-5" /></span>
        <div>
          <h2 class="font-semibold text-slate-800 dark:text-slate-100">Tambah Manual</h2>
          <p class="text-xs text-slate-500 dark:text-slate-400">Tulis satu soal essay atau pilihan ganda.</p>
        </div>
      </div>
      <div class="mt-4 grid gap-3 sm:grid-cols-3">
        <label class="block text-xs font-semibold uppercase tracking-wide text-slate-400">Tipe
          <select v-model="manual.type" class="field mt-1.5">
            <option value="essay">Essay</option>
            <option value="multiple_choice">Pilihan ganda</option>
          </select>
        </label>
        <label class="block text-xs font-semibold uppercase tracking-wide text-slate-400">Bobot poin
          <input v-model.number="manual.points" type="number" min="0" class="field mt-1.5">
        </label>
        <label class="block text-xs font-semibold uppercase tracking-wide text-slate-400 sm:col-span-1">Pertanyaan
          <input v-model="manual.question" class="field mt-1.5" placeholder="Tulis pertanyaan">
        </label>
      </div>
      <div v-if="manual.type === 'multiple_choice'" class="mt-3 space-y-2">
        <div v-for="(o, i) in manual.options" :key="o.label" class="flex items-center gap-2">
          <input :checked="o.isCorrect" type="radio" name="exam-correct" class="h-4 w-4 text-emerald-600 focus:ring-emerald-500" @change="setCorrect(i)">
          <b class="w-4 text-sm text-slate-700 dark:text-slate-200">{{ o.label }}.</b>
          <input v-model="o.text" class="field flex-1" :placeholder="`Pilihan ${o.label}`">
        </div>
      </div>
      <button class="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600" @click="addManual">
        <Icon name="heroicons:plus" class="h-4 w-4" /> Tambah soal
      </button>
    </section>

    <!-- ============ DAFTAR SOAL ============ -->
    <section class="space-y-3">
      <h2 class="font-semibold text-slate-800 dark:text-slate-100">Soal Ujian ({{ questions.length }})</h2>
      <div v-if="!questions.length" class="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-600 dark:bg-slate-800">
        <Icon name="heroicons:document-text" class="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
        <p class="mt-3 text-sm text-slate-500 dark:text-slate-400">Belum ada soal. Ambil dari bank soal atau tambah manual.</p>
      </div>
      <article v-for="(q, i) in questions" :key="q.id" class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-emerald-700">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="flex items-start gap-3">
              <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500 dark:bg-slate-700 dark:text-slate-300">{{ Number(i) + 1 }}</span>
              <p class="text-sm font-medium leading-relaxed text-slate-800 dark:text-slate-100">{{ q.question }}</p>
            </div>
            <div class="mt-3 flex flex-wrap items-center gap-2 pl-10 text-xs font-semibold">
              <span class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1" :class="q.type === 'essay' ? 'bg-violet-50 text-violet-600 dark:bg-violet-400/10 dark:text-violet-300' : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-300'">
                <Icon :name="q.type === 'essay' ? 'heroicons:pencil-square' : 'heroicons:list-bullet'" class="h-3.5 w-3.5" />
                {{ q.type === 'essay' ? 'Essay — koreksi manual' : 'Pilihan ganda — nilai otomatis' }}
              </span>
              <span class="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400"><Icon name="heroicons:star" class="h-3.5 w-3.5" /> {{ q.points }} poin</span>
            </div>
          </div>
          <button class="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20" @click="removeQuestion(q.id)">
            <Icon name="heroicons:trash" class="h-4 w-4" /> Hapus
          </button>
        </div>
      </article>
    </section>
  </div>
</template>

<style scoped>
@reference "~/assets/css/tailwind.css";
.field { @apply w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200; }
</style>
