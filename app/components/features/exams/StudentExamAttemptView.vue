<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any -- attempt payload varies by question type. */
const route = useRoute(); const { confirm } = useConfirm(); const attemptId = computed(() => String(route.params.attemptId))
const { data, pending, error: loadError } = await useFetch<any>(() => `/api/student/exam-attempts/${attemptId.value}`)
const detail = computed(() => data.value?.data); const questions = computed(() => detail.value?.questions ?? [])
const answers = reactive<Record<string, { selectedOptionId?: string; answerText?: string }>>({}); const saving = ref(false); const done = ref(false); const errorMessage = ref('')
const expiresAt = computed(() => detail.value?.attempt?.expiresAt ? new Date(detail.value.attempt.expiresAt).getTime() : 0)
const remainingSeconds = ref(0); let timer: ReturnType<typeof setInterval> | undefined
const autosaveTimers = new Map<string, ReturnType<typeof setTimeout>>()
watch(detail, (v) => { for (const q of v?.questions ?? []) answers[q.id] ||= {}; for (const a of v?.answers ?? []) answers[a.quizQuestionId] = { selectedOptionId: a.selectedOptionId ?? undefined, answerText: a.answerText ?? undefined }; remainingSeconds.value = Math.max(0, Math.ceil((expiresAt.value - Date.now()) / 1000)) }, { immediate: true })
onMounted(() => { timer = setInterval(() => { remainingSeconds.value = Math.max(0, Math.ceil((expiresAt.value - Date.now()) / 1000)); if (!remainingSeconds.value && !done.value) submit(true) }, 1000) })
onBeforeUnmount(() => { if (timer) clearInterval(timer); autosaveTimers.forEach(clearTimeout) })
const timeLabel = computed(() => `${String(Math.floor(remainingSeconds.value / 60)).padStart(2, '0')}:${String(remainingSeconds.value % 60).padStart(2, '0')}`)
function payload() { return questions.value.map((q: any) => ({ questionId: q.id, selectedOptionId: answers[q.id]?.selectedOptionId ?? null, answerText: answers[q.id]?.answerText ?? null })) }
function scheduleAutosave(questionId: string) { clearTimeout(autosaveTimers.get(questionId)); autosaveTimers.set(questionId, setTimeout(async () => { const a = answers[questionId]; try { await $fetch(`/api/student/exam-attempts/${attemptId.value}/answers`, { method: 'POST', body: { questionId, selectedOptionId: a?.selectedOptionId ?? null, answerText: a?.answerText ?? null } }) } catch { errorMessage.value = 'Jawaban belum tersimpan. Periksa koneksi lalu lanjutkan.' } }, 500)) }
async function submit(auto = false) { if (!auto && !await confirm({ title: 'Kirim jawaban?', message: 'Jawaban tidak dapat diubah setelah dikirim.', confirmLabel: 'Kirim jawaban' })) return; saving.value = true; try { await $fetch(`/api/student/exam-attempts/${attemptId.value}/submit`, { method: 'POST', body: { answers: payload() } }); done.value = true } catch (e: any) { errorMessage.value = e?.data?.statusMessage || 'Gagal mengirim jawaban' } finally { saving.value = false } }
const answeredCount = computed(() => questions.value.filter((q: any) => { const a = answers[q.id]; return a && (a.selectedOptionId || (a.answerText && a.answerText.trim())) }).length)
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-5 pb-8">
    <div v-if="pending" class="h-40 animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-700/50" />
    <div v-else-if="loadError" class="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">Gagal memuat ujian. Kembali ke daftar ujian, lalu coba lagi.</div>
    <template v-else-if="detail && !done">
      <section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div class="flex items-center justify-between gap-4"><div><span class="text-xs font-semibold text-emerald-600">Ujian Berlangsung</span><h1 class="mt-2 text-2xl font-bold">{{ detail.attempt.title || 'Ujian' }}</h1></div><div class="text-right"><p class="text-xs text-slate-500">Sisa waktu</p><p :class="['text-2xl font-bold', remainingSeconds < 300 ? 'text-red-600' : 'text-emerald-600']">{{ timeLabel }}</p></div></div>
        <div class="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div class="h-full bg-emerald-500" :style="{ width: `${questions.length ? (answeredCount / questions.length) * 100 : 0}%` }" /></div>
      </section>
      <p v-if="errorMessage" class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{{ errorMessage }}</p>
      <article v-for="(q, i) in questions" :key="q.id" class="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
        <p class="text-sm font-medium"><b>{{ Number(i) + 1 }}.</b> {{ q.question }}</p>
        <div v-if="q.type === 'multiple_choice'" class="mt-4 grid gap-2 pl-4"><label v-for="o in q.options" :key="o.id" class="flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm"><input v-model="answers[q.id]!.selectedOptionId" type="radio" :name="q.id" :value="o.id" @change="scheduleAutosave(q.id)"> {{ o.label }}. {{ o.text }}</label></div>
        <textarea v-else v-model="answers[q.id]!.answerText" class="field mt-4 h-28" placeholder="Tulis jawaban essay..." @input="scheduleAutosave(q.id)" />
      </article>
      <div class="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"><span class="text-sm text-slate-500">{{ answeredCount }}/{{ questions.length }} terjawab</span><button :disabled="saving" class="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50" @click="submit()">{{ saving ? 'Mengirim...' : 'Kirim Jawaban' }}</button></div>
    </template>
    <div v-else-if="done" class="rounded-3xl border border-slate-200 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-800"><h1 class="text-xl font-bold">Jawaban terkirim</h1><p class="mt-2 text-sm text-slate-500">Hasil pilihan ganda dihitung otomatis. Essay menunggu koreksi guru.</p><NuxtLink to="/dashboard/exams" class="mt-6 inline-flex rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white">Kembali ke daftar ujian</NuxtLink></div>
  </div>
</template>

<style scoped>
@reference "~/assets/css/tailwind.css";
.field { @apply w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none dark:border-slate-600 dark:bg-slate-800; }
</style>
