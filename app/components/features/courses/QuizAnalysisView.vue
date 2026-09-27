<script setup lang="ts">
import type { ItemAnalysisResult, ItemAnalysisRow } from '~/types/itemAnalysis'

const route = useRoute()
const courseId = computed(() => String(route.params.id))
const quizId = computed(() => String(route.params.activityId))
const { returnTo } = useCourseReturn(() => `/dashboard/courses/${courseId.value}/quizzes/${quizId.value}`)
const { data: courseData } = await useFetch<any>(() => `/api/courses/${courseId.value}`)
const activity = computed(() => courseData.value?.data?.sections?.flatMap((s: any) => s.activities ?? []).find((a: any) => a.id === quizId.value))
const { items: breadcrumbItems } = useCourseBreadcrumb({ courseId, activityId: quizId, course: () => courseData.value?.data, leaf: () => ({ label: 'Analisis Butir Soal' }) })

const classId = ref('')
const { data, pending, refresh } = await useFetch<{ data: ItemAnalysisResult }>(() => `/api/courses/${courseId.value}/quizzes/${quizId.value}/analysis`, { query: { classId }, watch: [classId] })
const analysis = computed(() => data.value?.data)
const items = computed(() => analysis.value?.items ?? [])
const summary = computed(() => analysis.value?.summary)

const expanded = ref<string | null>(null)
function toggle(id: string) { expanded.value = expanded.value === id ? null : id }

const keyModal = ref<{ questionId: string; options: any[] } | null>(null)
const selectedOption = ref('')
const savingKey = ref(false)
async function openKeyChange(item: ItemAnalysisRow) {
  selectedOption.value = ''
  keyModal.value = { questionId: item.id, options: item.options }
}
async function submitKeyChange() {
  if (!keyModal.value || !selectedOption.value) return
  savingKey.value = true
  try {
    await $fetch(`/api/courses/${courseId.value}/quizzes/${quizId.value}/questions/${keyModal.value.questionId}/answer-key`, {
      method: 'PATCH',
      body: { optionId: selectedOption.value },
    })
    keyModal.value = null
    await refresh()
  } finally { savingKey.value = false }
}

function downloadExport() {
  const url = `/api/courses/${courseId.value}/quizzes/${quizId.value}/analysis-export?classId=${classId.value}`
  window.open(url, '_blank')
}

const riskClass = (status: string) => {
  switch (status) {
    case 'dipertahankan': return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
    case 'revisi': return 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'
    case 'kunci': return 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
    default: return 'bg-slate-100 text-slate-600 dark:bg-slate-700/40 dark:text-slate-300'
  }
}
</script>

<template>
  <div class="mx-auto max-w-6xl space-y-5">
    <AppBreadcrumb :back-to="returnTo" :items="breadcrumbItems" />
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-slate-800 dark:text-slate-100">Analisis Butir Soal</h1>
        <p class="text-sm text-slate-500">{{ activity?.title || 'Quiz' }}</p>
      </div>
      <div class="flex gap-2">
        <button class="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700" @click="downloadExport">Export Excel</button>
      </div>
    </header>

    <!-- Filter Kelas -->
    <section class="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800 sm:grid-cols-[1fr_auto]">
      <select v-model="classId" class="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800">
        <option value="">Semua Kelas</option>
        <option v-for="cls in (analysis?.classes ?? [])" :key="cls.id" :value="cls.id">{{ cls.name }} ({{ cls.count }})</option>
      </select>
    </section>

    <div v-if="pending" class="space-y-3">
      <div class="grid grid-cols-2 gap-4 lg:grid-cols-4"><div v-for="i in 4" :key="i" class="h-24 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-700" /></div>
      <div class="h-64 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-700" />
    </div>

    <div v-else-if="!analysis || analysis.participants === 0" class="rounded-xl border bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800">Belum ada data analisis untuk kelas ini.</div>

    <template v-else>
      <!-- Summary Cards -->
      <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div class="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <div class="text-xs font-semibold uppercase text-slate-400">Peserta</div>
          <div class="mt-1 text-2xl font-bold text-slate-800 dark:text-slate-100">{{ summary?.participants ?? 0 }}</div>
          <div v-if="analysis.smallSample" class="text-xs text-amber-600">Data terbatas, hasil kurang stabil</div>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <div class="text-xs font-semibold uppercase text-slate-400">Rata-rata skor</div>
          <div class="mt-1 text-2xl font-bold text-slate-800 dark:text-slate-100">{{ summary?.mean ?? 0 }}</div>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <div class="text-xs font-semibold uppercase text-slate-400">Skor min – max</div>
          <div class="mt-1 text-2xl font-bold text-slate-800 dark:text-slate-100">{{ summary?.min ?? 0 }} – {{ summary?.max ?? 0 }}</div>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <div class="text-xs font-semibold uppercase text-slate-400">Reliabilitas ({{ summary?.reliabilityMethod ?? '-' }})</div>
          <div class="mt-1 text-2xl font-bold text-slate-800 dark:text-slate-100">{{ summary?.reliability ?? 0 }}</div>
        </div>
      </div>

      <!-- Grafik Distribusi Skor -->
      <section class="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <h3 class="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Distribusi Skor</h3>
        <div class="space-y-1">
          <div v-for="b in (analysis.histogram ?? [])" :key="b.from" class="flex items-center gap-2 text-xs">
            <span class="w-20 text-right tabular-nums text-slate-500">{{ b.from }}–{{ b.to }}</span>
            <div class="h-4 flex-1 overflow-hidden rounded bg-slate-100 dark:bg-slate-700">
              <div class="h-full bg-emerald-500" :style="{ width: `${analysis.participants ? (b.count / analysis.participants) * 100 : 0}%` }" />
            </div>
            <span class="w-6 tabular-nums text-slate-500">{{ b.count }}</span>
          </div>
        </div>
      </section>

      <!-- Tabel per Soal -->
      <section class="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <div class="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-200">Analisis per Soal ({{ items.length }})</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-700/40"><tr><th class="p-3">No</th><th class="p-3">Tipe</th><th class="p-3">Soal</th><th class="p-3 text-right">Kesukaran</th><th class="p-3 text-right">Daya Pembeda</th><th class="p-3 text-right">Validitas</th><th class="p-3">Rekomendasi</th><th class="p-3" /></tr></thead>
            <tbody>
              <template v-for="item in items" :key="item.id">
                <tr class="cursor-pointer border-t dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/40" @click="toggle(item.id)">
                  <td class="p-3 font-medium">{{ item.position }}</td>
                  <td class="p-3"><span class="rounded-full px-2 py-0.5 text-xs font-semibold" :class="item.type === 'essay' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300'">{{ item.type === 'essay' ? 'Essay' : 'PG' }}</span></td>
                  <td class="max-w-xs truncate p-3">{{ item.question }}</td>
                  <td class="whitespace-nowrap p-3 text-right">
                    <span class="font-semibold" :class="item.difficultyLabel === 'Sukar' ? 'text-red-600' : item.difficultyLabel === 'Mudah' ? 'text-emerald-600' : 'text-amber-600'">{{ item.difficulty != null ? `${Math.round((item.difficulty as number) * 100)}%` : '—' }}</span>
                    <span class="ml-1 text-xs text-slate-400">{{ item.difficultyLabel }}</span>
                  </td>
                  <td class="whitespace-nowrap p-3 text-right">
                    <span class="font-semibold" :class="(item.discrimination as number) == null ? 'text-slate-400' : (item.discrimination as number) < 0.2 ? 'text-red-600' : 'text-emerald-600'">{{ item.discrimination != null ? (item.discrimination as number).toFixed(2) : '—' }}</span>
                    <span class="ml-1 text-xs text-slate-400">{{ item.discriminationLabel }}</span>
                  </td>
                  <td class="whitespace-nowrap p-3 text-right">
                    <span class="font-semibold" :class="(item.validity as number) == null ? 'text-slate-400' : (item.validity as number) < 0.2 ? 'text-red-600' : 'text-emerald-600'">{{ item.validity != null ? (item.validity as number).toFixed(2) : '—' }}</span>
                    <span class="ml-1 text-xs text-slate-400">{{ item.validityLabel }}</span>
                  </td>
                  <td class="p-3"><span class="rounded-full px-2 py-0.5 text-xs font-semibold" :class="riskClass(item.recommendation.status)">{{ item.recommendation.label }}</span></td>
                  <td class="p-3 text-right"><span class="text-xs text-slate-400">{{ expanded === item.id ? '▲' : '▼' }}</span></td>
                </tr>

                <!-- Expanded Detail -->
                <tr v-if="expanded === item.id" class="border-t bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60">
                  <td colspan="7" class="p-4">
                    <div class="max-w-3xl space-y-3 text-sm">
                      <p class="font-medium">{{ item.question }}</p>
                      <p v-if="item.explanation" class="text-xs text-slate-500">Pembahasan: {{ item.explanation }}</p>

                      <!-- Pilihan jawaban -->
                      <table v-if="item.type === 'multiple_choice'" class="w-full">
                        <thead class="text-xs uppercase text-slate-500"><tr><th class="p-1 text-left">Opsi</th><th class="p-1 text-right">Jumlah</th><th class="p-1 text-right">%</th><th class="p-1 text-right">Atas</th><th class="p-1 text-right">Bawah</th><th class="p-1 text-right">Efektif</th><th class="p-1 text-right">Aksi</th></tr></thead>
                        <tbody>
                          <tr v-for="o in item.options" :key="o.label" :class="o.isCorrect ? 'font-semibold text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'">
                            <td class="p-1">{{ o.label }}. {{ o.text }} {{ o.isCorrect ? '✓' : '' }}</td>
                            <td class="p-1 text-right">{{ o.count }}</td>
                            <td class="p-1 text-right">{{ o.pct }}%</td>
                            <td class="p-1 text-right">{{ o.upperCount }}</td>
                            <td class="p-1 text-right">{{ o.lowerCount }}</td>
                            <td class="p-1 text-right">{{ o.isCorrect ? '-' : o.effective ? 'Ya' : 'Tidak' }}</td>
                            <td class="p-1 text-right">
                              <button v-if="o.isCorrect" class="text-xs text-amber-600 underline" @click.stop="openKeyChange(item)">Ubah kunci</button>
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      <!-- Essay stats -->
                      <div v-if="item.type === 'essay' && item.essayDist" class="space-y-1">
                        <div class="text-xs text-slate-500">Distribusi skor essay: Penuh {{ item.essayDist.full }} · Sebagian {{ item.essayDist.partial }} · Nol {{ item.essayDist.zero }}</div>
                      </div>
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Peserta -->
      <section class="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <h3 class="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Hasil Peserta ({{ (analysis.participantList ?? []).length }})</h3>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-700/40"><tr><th class="p-2">Nama</th><th class="p-2">Kelas</th><th class="p-2">Percobaan</th><th class="p-2 text-right">Nilai</th></tr></thead>
            <tbody>
              <tr v-for="p in analysis.participantList" :key="p.studentId" class="border-t dark:border-slate-700"><td class="p-2 font-medium">{{ p.name }}</td><td class="p-2">{{ p.className }}</td><td class="p-2">#{{ p.attemptNumber }}</td><td class="p-2 text-right font-semibold">{{ p.score }}</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>

    <!-- Modal Ubah Kunci -->
    <Teleport to="body">
      <div v-if="keyModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="keyModal = null">
        <div class="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-slate-800">
          <h2 class="mb-1 text-lg font-bold">Ubah Kunci Jawaban</h2>
          <p class="mb-4 text-xs text-amber-600">Mengubah kunci akan otomatis menilai ulang semua siswa.</p>
          <div class="space-y-2">
            <label v-for="o in keyModal.options" :key="o.id" class="flex items-center gap-2 rounded-lg border border-slate-200 p-3 dark:border-slate-600">
              <input v-model="selectedOption" type="radio" :value="o.id" class="h-4 w-4 accent-emerald-600">
              <span class="font-semibold">{{ o.label }}.</span>
              <span class="text-sm">{{ o.text }}</span>
            </label>
          </div>
          <div class="mt-5 flex justify-end gap-2">
            <button class="rounded-lg border border-slate-200 px-4 py-2 text-sm dark:border-slate-600 dark:text-slate-300" @click="keyModal = null">Batal</button>
            <button class="rounded-lg bg-emerald-500 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50" :disabled="!selectedOption || savingKey" @click="submitKeyChange">{{ savingKey ? 'Menyimpan...' : 'Simpan & Nilai Ulang' }}</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>