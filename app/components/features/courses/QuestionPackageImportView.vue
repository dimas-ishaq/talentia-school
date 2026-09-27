<script setup lang="ts">
import { pesanDariError } from '~/composables/useStudents'
const route = useRoute()
const packageId = computed(() => String(route.params.id))
const format = ref<'aiken' | 'csv'>('aiken')
const text = ref('')
const isSubmitting = ref(false)
const errorMessage = ref('')
const resultMessage = ref('')
const aikenSample = `Ibukota Indonesia adalah?\nA. Bandung\nB. Jakarta\nC. Surabaya\nD. Medan\nANSWER: B`
const csvSample = `type,question,option_a,option_b,option_c,option_d,correct,points\nmultiple_choice,"2 + 2 = ?","3","4","5","6",B,1\nessay,"Jelaskan proses fotosintesis","","","","",,5`
function isiContoh() { text.value = format.value === 'aiken' ? aikenSample : csvSample }
async function handleSubmit() {
  if (!text.value.trim()) return
  isSubmitting.value = true; errorMessage.value = ''; resultMessage.value = ''
  try { const res = await $fetch<{ count: number }>(`/api/question-packages/${packageId.value}/import`, { method: 'POST', body: { format: format.value, text: text.value } }); resultMessage.value = `${res.count} soal berhasil diimport.`; text.value = '' }
  catch (e: unknown) { errorMessage.value = pesanDariError(e, 'Gagal import soal') } finally { isSubmitting.value = false }
}
</script>
<template>
  <div class="mx-auto max-w-3xl space-y-4">
    <NuxtLink :to="`/dashboard/question-packages/${packageId}`" class="text-sm text-slate-500">&larr; Kembali ke Paket Soal</NuxtLink>
    <h1 class="text-2xl font-bold">Import Soal</h1>
    <div v-if="errorMessage" class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{{ errorMessage }}</div>
    <div v-if="resultMessage" class="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{{ resultMessage }} <NuxtLink :to="`/dashboard/question-packages/${packageId}`" class="underline">Lihat</NuxtLink></div>
    <form class="space-y-4 rounded-xl border bg-white p-5 dark:border-slate-700 dark:bg-slate-800" @submit.prevent="handleSubmit">
      <label class="text-xs font-semibold uppercase text-slate-400">Format<select v-model="format" class="field mt-1"><option value="aiken">Aiken (pilihan ganda)</option><option value="csv">CSV (PG + Essay)</option></select></label>
      <div class="flex items-center justify-between"><p class="text-xs text-slate-500">{{ format === 'aiken' ? 'Format Aiken: pertanyaan, pilihan A–D, lalu ANSWER: X.' : 'Header CSV: type, question, option_a..d, correct, points.' }}</p><button type="button" class="text-xs font-semibold text-emerald-600 underline" @click="isiContoh">Isi contoh</button></div>
      <textarea v-model="text" rows="14" class="field font-mono text-xs" :placeholder="format === 'aiken' ? 'Tempel format Aiken di sini...' : 'Tempel CSV di sini...'" />
      <div class="flex justify-end gap-2"><NuxtLink :to="`/dashboard/question-packages/${packageId}`" class="rounded-lg border px-4 py-2 text-sm">Batal</NuxtLink><button :disabled="isSubmitting || !text.trim()" class="rounded-lg bg-emerald-500 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">{{ isSubmitting ? 'Mengimport...' : 'Import' }}</button></div>
    </form>
  </div>
</template>
<style scoped>
@reference "~/assets/css/tailwind.css";.field { @apply w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:border-emerald-400; }</style>
