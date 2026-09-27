<script setup lang="ts">
import { pesanDariError } from '~/composables/useStudents'
const route = useRoute()
const packageId = computed(() => String(route.params.id))
const form = reactive({ type: 'multiple_choice' as 'multiple_choice' | 'essay', question: '', explanation: '', defaultPoints: 1, options: Array.from({ length: 5 }, (_, i) => ({ label: String.fromCharCode(65 + i), text: '', isCorrect: i === 0 })) })
const isSubmitting = ref(false)
const errorMessage = ref('')
const errors = computed(() => {
  const e: Record<string, string> = {}
  if (!form.question.trim()) e.question = 'Pertanyaan wajib diisi'
  if (form.type === 'multiple_choice') {
    if (form.options.filter((o) => o.text.trim()).length < 2) e.options = 'Minimal 2 pilihan terisi'
    else if (!form.options.some((o) => o.isCorrect)) e.options = 'Tentukan jawaban benar'
  }
  return e
})
function setCorrect(idx: number) { for (let i = 0; i < form.options.length; i++) form.options[i]!.isCorrect = i === idx }
function addOption() { form.options.push({ label: String.fromCharCode(65 + form.options.length), text: '', isCorrect: false }) }
async function handleSubmit() {
  if (Object.keys(errors.value).length) return
  isSubmitting.value = true; errorMessage.value = ''
  try {
    await $fetch(`/api/question-packages/${packageId.value}/questions`, { method: 'POST', body: { type: form.type, question: form.question.trim(), explanation: form.explanation.trim(), defaultPoints: form.defaultPoints, options: form.type === 'multiple_choice' ? form.options : [] } })
    await navigateTo(`/dashboard/question-packages/${packageId.value}`)
  } catch (e: unknown) { errorMessage.value = pesanDariError(e, 'Gagal menyimpan soal') } finally { isSubmitting.value = false }
}
</script>
<template>
  <div class="mx-auto max-w-3xl space-y-4">
    <NuxtLink :to="`/dashboard/question-packages/${packageId}`" class="text-sm text-slate-500">&larr; Kembali ke Paket Soal</NuxtLink>
    <h1 class="text-2xl font-bold">Buat Soal</h1>
    <div v-if="errorMessage" class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{{ errorMessage }}</div>
    <form class="space-y-4 rounded-xl border bg-white p-5 dark:border-slate-700 dark:bg-slate-800" @submit.prevent="handleSubmit">
      <label class="text-xs font-semibold uppercase text-slate-400">Tipe<select v-model="form.type" class="field mt-1"><option value="multiple_choice">Pilihan ganda (auto nilai)</option><option value="essay">Essay (koreksi manual)</option></select></label>
      <label class="text-xs font-semibold uppercase text-slate-400">Pertanyaan <span class="text-red-500">*</span><textarea v-model="form.question" rows="3" class="field mt-1 h-24" :class="errors.question ? 'border-red-300' : ''" /><span v-if="errors.question" class="text-xs text-red-500">{{ errors.question }}</span></label>
      <template v-if="form.type === 'multiple_choice'"><div class="space-y-2"><div v-for="(o, i) in form.options" :key="o.label" class="flex items-center gap-2"><input :checked="o.isCorrect" type="radio" @change="setCorrect(i)"><span class="w-6 font-semibold">{{ o.label }}.</span><input v-model="o.text" :placeholder="`Pilihan ${o.label}`" class="field flex-1"></div><button type="button" class="text-sm text-emerald-600" @click="addOption">+ Tambah pilihan</button><p v-if="errors.options" class="text-xs text-red-500">{{ errors.options }}</p></div></template>
      <label class="text-xs font-semibold uppercase text-slate-400">Bobot<input v-model.number="form.defaultPoints" type="number" min="0" class="field mt-1 w-32"></label>
      <label class="text-xs font-semibold uppercase text-slate-400">Penjelasan<textarea v-model="form.explanation" rows="2" class="field mt-1" placeholder="Opsional" /></label>
      <div class="flex justify-end gap-2"><NuxtLink :to="`/dashboard/question-packages/${packageId}`" class="rounded-lg border px-4 py-2 text-sm">Batal</NuxtLink><button :disabled="isSubmitting || Object.keys(errors).length > 0" class="rounded-lg bg-emerald-500 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">{{ isSubmitting ? 'Menyimpan...' : 'Simpan' }}</button></div>
    </form>
  </div>
</template>
<style scoped>
@reference "~/assets/css/tailwind.css";.field { @apply w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:border-emerald-400; }</style>
