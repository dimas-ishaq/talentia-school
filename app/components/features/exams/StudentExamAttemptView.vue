<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any -- attempt payload varies by question type. */
const route = useRoute(); const { confirm } = useConfirm(); const attemptId = computed(() => String(route.params.attemptId))
const { data, pending } = await useFetch<any>(() => `/api/student/exam-attempts/${attemptId.value}`)
const detail = computed(() => data.value?.data); const questions = computed(() => detail.value?.questions ?? [])
const answers = reactive<Record<string, { selectedOptionId?: string; answerText?: string }>>({}); const saving = ref(false); const done = ref(false); const errorMessage = ref('')
watch(detail, (v) => { for (const q of v?.questions ?? []) answers[q.id] ||= {}; for (const a of v?.answers ?? []) answers[a.quizQuestionId] = { selectedOptionId: a.selectedOptionId ?? undefined, answerText: a.answerText ?? undefined } }, { immediate: true })
function payload() { return questions.value.map((q: any) => ({ questionId: q.id, selectedOptionId: answers[q.id]?.selectedOptionId ?? null, answerText: answers[q.id]?.answerText ?? null })) }
async function submit() { if (!await confirm({ title: 'Kirim jawaban?', message: 'Jawaban tidak dapat diubah setelah dikirim.', confirmLabel: 'Kirim jawaban' })) return; saving.value = true; try { await $fetch(`/api/student/exam-attempts/${attemptId.value}/submit`, { method: 'POST', body: { answers: payload() } }); done.value = true } catch (e: any) { errorMessage.value = e?.data?.statusMessage || 'Gagal mengirim jawaban' } finally { saving.value = false } }

const answeredCount = computed(() => questions.value.filter((q: any) => {
  const a = answers[q.id]
  return a && (a.selectedOptionId || (a.answerText && a.answerText.trim()))
}).length)
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-5 pb-8">
    <div v-if="pending" class="h-40 animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-700/50" />

    <template v-else-if="detail && !done">
      <!-- ============ HEADER ============ -->
      <section class="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div class="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />
        <div class="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div class="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-400/10 dark:text-emerald-300">
              <Icon name="heroicons:beaker" class="h-4 w-4" /> Ujian Berlangsung
            </div>
            <h1 class="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{{ detail.attempt.title || 'Ujian' }}</h1>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Jawab semua soal, lalu kirim jawaban.</p>
          </div>
          <div class="rounded-2xl border border-slate-100 bg-slate-50/60 px-5 py-3 text-center dark:border-slate-700 dark:bg-slate-900/30">
            <p class="text-xs font-medium text-slate-500 dark:text-slate-400">Terjawab</p>
            <p class="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{{ answeredCount }}<span class="text-sm text-slate-400">/{{ questions.length }}</span></p>
          </div>
        </div>
        <div class="relative mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
          <div class="h-full rounded-full bg-emerald-500 transition-all" :style="{ width: `${questions.length ? (answeredCount / questions.length) * 100 : 0}%` }" />
        </div>
      </section>

      <p v-if="errorMessage" class="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
        <Icon name="heroicons:exclamation-circle" class="h-4 w-4 shrink-0" /> {{ errorMessage }}
      </p>

      <!-- ============ SOAL ============ -->
      <article v-for="(q, i) in questions" :key="q.id" class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div class="flex items-start gap-3">
          <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-xs font-bold text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300">{{ Number(i) + 1 }}</span>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium leading-relaxed text-slate-800 dark:text-slate-100">{{ q.question }}</p>
            <span class="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400"><Icon name="heroicons:star" class="h-3.5 w-3.5" /> {{ q.points }} poin</span>
          </div>
        </div>

        <div v-if="q.type === 'multiple_choice'" class="mt-4 grid gap-2 pl-10">
          <label
            v-for="o in q.options"
            :key="o.id"
            class="flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition"
            :class="answers[q.id]?.selectedOptionId === o.id
              ? 'border-emerald-400 bg-emerald-50 text-emerald-800 dark:border-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-200'
              : 'border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700/50'"
          >
            <input v-model="answers[q.id]!.selectedOptionId" type="radio" :name="q.id" :value="o.id" class="h-4 w-4 text-emerald-600 focus:ring-emerald-500">
            <span class="font-semibold">{{ o.label }}.</span> {{ o.text }}
          </label>
        </div>
        <textarea v-else v-model="answers[q.id]!.answerText" class="field mt-4 ml-10 h-28" placeholder="Tulis jawaban essay..." />
      </article>

      <div class="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <p class="text-sm text-slate-500 dark:text-slate-400">{{ answeredCount }} dari {{ questions.length }} soal terjawab</p>
        <button class="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-600 disabled:opacity-50" :disabled="saving" @click="submit">
          <Icon v-if="saving" name="heroicons:arrow-path" class="h-4 w-4 animate-spin" />
          <Icon v-else name="heroicons:paper-airplane" class="h-4 w-4" />
          {{ saving ? 'Mengirim...' : 'Kirim Jawaban' }}
        </button>
      </div>
    </template>

    <!-- ============ SELESAI ============ -->
    <div v-else-if="done" class="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <span class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300">
        <Icon name="heroicons:check-badge" class="h-8 w-8" />
      </span>
      <h1 class="mt-4 text-xl font-bold text-slate-800 dark:text-slate-100">Jawaban terkirim</h1>
      <p class="mx-auto mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">Hasil pilihan ganda dihitung otomatis. Essay menunggu koreksi guru.</p>
      <NuxtLink to="/dashboard/exams" class="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600">
        <Icon name="heroicons:arrow-left" class="h-4 w-4" /> Kembali ke daftar ujian
      </NuxtLink>
    </div>
  </div>
</template>

<style scoped>
@reference "~/assets/css/tailwind.css";
.field { @apply w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200; }
</style>
