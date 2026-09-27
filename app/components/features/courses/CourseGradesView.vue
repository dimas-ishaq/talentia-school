<template>
  <div class="space-y-6">
    <AppBreadcrumb :back-to="returnTo" :items="breadcrumbItems" />
    <!-- Konfigurasi Bobot Nilai -->
    <section class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
      <header class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="text-xl font-bold text-slate-800 dark:text-slate-100">Konfigurasi Bobot Nilai</h1>
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Atur persentase bobot tiap tipe aktivitas. Total harus 100%.</p>
        </div>
        <button
          class="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
          :disabled="savingWeight || totalWeight !== 100"
          @click="saveWeights"
        >
          <Icon name="heroicons:check" class="h-4 w-4" />
          {{ savingWeight ? 'Menyimpan...' : 'Simpan Bobot' }}
        </button>
      </header>

      <p v-if="weightsError" class="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">{{ weightsError }}</p>
      <p v-if="saveMessage" class="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">{{ saveMessage }}</p>

      <!-- Template konfigurasi siap pakai -->
      <div class="mt-5">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h2 class="text-sm font-semibold text-slate-700 dark:text-slate-200">Template Cepat</h2>
          <p class="text-xs text-slate-500 dark:text-slate-400">Klik salah satu template untuk mengisi bobot otomatis. Anda masih bisa menyesuaikan manual.</p>
        </div>
        <div class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <button
            v-for="preset in presets"
            :key="preset.id"
            type="button"
            class="group flex items-start gap-3 rounded-xl border p-3 text-left transition"
            :class="activePresetId === preset.id
              ? 'border-emerald-500 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-900/20'
              : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/40 dark:border-slate-600 dark:bg-slate-800 dark:hover:border-emerald-700 dark:hover:bg-emerald-900/10'"
            @click="applyPreset(preset)"
          >
            <span
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
              :class="activePresetId === preset.id ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-emerald-100 group-hover:text-emerald-600 dark:bg-slate-700 dark:text-slate-300'"
            >
              <Icon :name="preset.icon" class="h-5 w-5" />
            </span>
            <span class="min-w-0">
              <span class="flex items-center gap-1.5">
                <span class="text-sm font-semibold text-slate-800 dark:text-slate-100">{{ preset.name }}</span>
                <Icon v-if="activePresetId === preset.id" name="heroicons:check-circle-solid" class="h-4 w-4 text-emerald-500" />
              </span>
              <span class="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{{ preset.description }}</span>
              <span class="mt-2 flex flex-wrap gap-1">
                <span
                  v-for="(value, type) in preset.weights"
                  v-show="value > 0"
                  :key="type"
                  class="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-300"
                >{{ typeLabel(String(type)) }} {{ value }}%</span>
              </span>
            </span>
          </button>
        </div>
      </div>

      <div class="mt-6 border-t border-slate-100 pt-5 dark:border-slate-700">
        <h2 class="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">Bobot per Tipe Aktivitas</h2>
        <div class="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        <div v-for="type in types" :key="type">
          <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{{ typeLabel(type) }}</label>
          <div class="flex items-center gap-2">
            <input
              v-model.number="form[type]"
              type="number" min="0" max="100" step="1"
              class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
            >
            <span class="shrink-0 text-xs text-slate-500 dark:text-slate-400">%</span>
          </div>
        </div>

        <div class="sm:col-span-2 md:col-span-3 lg:col-span-4 rounded-lg bg-slate-50 p-3 dark:bg-slate-700/40">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-slate-600 dark:text-slate-300">Total Bobot</span>
            <span class="text-lg font-bold" :class="totalWeight === 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'">{{ totalWeight }}%</span>
          </div>
          <p class="mt-1 text-xs" :class="totalWeight === 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'">
            {{ totalWeight === 100 ? 'Total bobot valid.' : 'Total bobot harus tepat 100%.' }}
          </p>
        </div>
      </div>
      </div>
    </section>

    <!-- Perhitungan Nilai Akhir -->
    <section class="rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/10 p-6">
      <header class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 class="font-bold text-slate-800 dark:text-slate-100">Perhitungan Nilai Akhir</h2>
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Hitung ulang snapshot nilai akhir seluruh siswa berdasarkan bobot di atas.</p>
        </div>
        <button
          class="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          :disabled="calculating || totalWeight !== 100"
          @click="calculateGrades"
        >
          <Icon name="heroicons:arrow-path" class="h-4 w-4" />
          {{ calculating ? 'Menghitung...' : 'Re-kalkulasi Nilai' }}
        </button>
      </header>
      <p v-if="calcMessage" class="mt-4 rounded-lg border border-emerald-300 bg-white px-4 py-3 text-sm text-emerald-700 dark:border-emerald-700 dark:bg-slate-800 dark:text-emerald-300">{{ calcMessage }}</p>

      <!-- Fase 3: publish nilai ke siswa -->
      <div class="mt-5 flex flex-wrap items-center gap-3 border-t border-emerald-200 pt-5 dark:border-emerald-800">
        <button
          class="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          :class="published ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-600 hover:bg-emerald-700'"
          :disabled="publishing"
          @click="togglePublish"
        >
          <Icon :name="published ? 'heroicons:eye-slash' : 'heroicons:eye'" class="h-4 w-4" />
          {{ publishing ? 'Memproses...' : published ? 'Sembunyikan dari Siswa' : 'Publish Nilai ke Siswa' }}
        </button>
        <span class="text-xs text-slate-600 dark:text-slate-400">
          {{ published
            ? `Nilai terlihat oleh siswa sejak ${formatDate(publishState.publishedAt)}.`
            : 'Nilai masih draft. Siswa tidak melihat nilai sampai dipublish.' }}
        </span>
        <p v-if="publishError" class="w-full text-xs text-red-600 dark:text-red-400">{{ publishError }}</p>
      </div>
    </section>

    <!-- Snapshot Nilai Akhir -->
    <section class="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
      <div v-if="pendingGrades" class="h-40 animate-pulse bg-slate-100 dark:bg-slate-700" />
      <template v-else-if="gradesError">
        <div class="p-6 text-center text-sm text-red-600 dark:text-red-400">{{ gradesError }}</div>
      </template>
      <template v-else-if="snapshots.length === 0">
        <div class="p-10 text-center text-sm text-slate-500 dark:text-slate-400">Belum ada nilai akhir. Atur bobot lalu klik "Re-kalkulasi Nilai".</div>
      </template>
      <template v-else>
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <h2 class="font-bold text-slate-800 dark:text-slate-100">Nilai Akhir Siswa</h2>
          <span class="text-xs text-slate-500 dark:text-slate-400">Versi {{ snapshots[0]?.version }} · dihitung {{ formatDate(snapshots[0]?.calculatedAt) }}</span>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full text-sm">
            <thead class="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-700/40">
              <tr>
                <th class="px-4 py-3 font-semibold">Siswa</th>
                <th class="px-4 py-3 text-center font-semibold">Predikat</th>
                <th class="px-4 py-3 text-right font-semibold">Nilai</th>
                <th class="px-4 py-3 font-semibold">Rincian Komponen</th>
                <th class="px-4 py-3 font-semibold">Feedback</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-700">
              <tr v-for="row in snapshots" :key="row.id" class="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                <td class="px-4 py-3 align-top">
                  <div class="font-medium text-slate-800 dark:text-slate-200">{{ row.studentName }}</div>
                  <div class="text-xs text-slate-400 dark:text-slate-500">{{ row.nis }} · {{ row.className }}</div>
                </td>
                <td class="px-4 py-3 align-top text-center">
                  <span class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold" :class="gradeClass(row.grade)">{{ row.grade }}</span>
                </td>
                <td class="px-4 py-3 align-top text-right font-bold text-slate-700 dark:text-slate-300">{{ Number(row.score).toFixed(0) }}</td>
                <td class="px-4 py-3 align-top">
                  <div class="flex flex-wrap gap-1">
                    <span v-for="(comp, type) in parseComponents(row.componentsJson)" :key="type" class="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600 dark:bg-slate-700 dark:text-slate-300" :title="`${comp.count} aktivitas dinilai · bobot ${comp.weight}%`">
                      {{ typeLabel(String(type)) }}: {{ comp.average.toFixed(0) }}
                    </span>
                  </div>
                </td>
                <td class="px-4 py-3 align-top">
                  <textarea
                    :value="feedbackEdit[row.studentId] ?? row.feedback ?? ''"
                    class="min-h-[2.5rem] w-full min-w-48 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                    placeholder="Catatan (opsional)..."
                    @input="feedbackEdit[row.studentId] = ($event.target as HTMLTextAreaElement).value"
                  />
                  <button
                    v-if="(feedbackEdit[row.studentId] ?? '') !== (row.feedback ?? '')"
                    class="mt-1 rounded-md bg-emerald-500 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-600"
                    @click="updateFeedback(row)"
                  >Simpan</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </section>
  </div>
</template>

<script setup lang="ts">
import { GRADE_WEIGHT_PRESETS, type GradeWeightPreset } from '~~/shared/gradeWeightPresets.ts'

const route = useRoute()
const courseId = computed(() => String(route.params.id))
const { returnTo } = useCourseReturn(() => `/dashboard/courses/${courseId.value}`)
const { items: breadcrumbItems } = useCourseBreadcrumb({ courseId, leaf: () => ({ label: 'Bobot & Nilai' }) })

const { data: weightData, pending: pendingWeights } = await useFetch<{ data: { weights: Record<string, number>; types: string[] } }>(
  () => `/api/courses/${courseId.value}/grade-weights`,
  { key: `course-weights-${courseId.value}` },
)
const { data: gradeData, pending: pendingGrades, refresh: refreshGrades } = await useFetch<{ data: any[] }>(
  () => `/api/courses/${courseId.value}/final-grades`,
  { key: `course-grades-${courseId.value}` },
)

const types = computed(() => weightData.value?.data?.types ?? [])
const snapshots = computed(() => gradeData.value?.data ?? [])

// Form bobot — diinisialisasi dari data server
const form = reactive<Record<string, number>>({})
watch(weightData, (val) => {
  const weights = val?.data?.weights ?? {}
  const allTypes = val?.data?.types ?? []
  for (const t of allTypes) {
    if (!(t in form)) form[t] = Number(weights[t] ?? 0)
  }
  activePresetId.value = detectPreset(weights, allTypes)
}, { immediate: true })

function detectPreset(weights: Record<string, number>, allTypes: string[]): string | null {
  const match = GRADE_WEIGHT_PRESETS.find((preset) =>
    allTypes.every((t) => Number(preset.weights[t] ?? 0) === Number(weights[t] ?? 0)),
  )
  return match?.id ?? null
}

const totalWeight = computed(() => Object.values(form).reduce((sum, v) => sum + Number(v || 0), 0))
const presets = GRADE_WEIGHT_PRESETS
const activePresetId = ref<string | null>(null)

function applyPreset(preset: GradeWeightPreset) {
  for (const type of types.value) form[type] = Number(preset.weights[type] ?? 0)
  activePresetId.value = preset.id
  saveMessage.value = `${preset.name} dipilih. Klik Simpan Bobot untuk menerapkan.`
}

const savingWeight = ref(false)
const weightsError = ref('')
const saveMessage = ref('')

const publishing = ref(false)
const publishError = ref('')
const publishState = reactive<{ published: boolean; publishedAt: string | null }>({ published: false, publishedAt: null })
const published = computed(() => publishState.published || snapshots.value.some((r: any) => !!r.publishedAt))
watch(snapshots, (rows) => {
  const d = (rows as any[]).find((r) => !!r.publishedAt)
  publishState.publishedAt = d?.publishedAt ?? null
  publishState.published = !!d
}, { immediate: true })

async function togglePublish() {
  publishing.value = true; publishError.value = ''
  try {
    await $fetch(`/api/courses/${courseId.value}/gradebook/publish`, { method: 'POST', body: { scope: 'all', publish: !published.value } })
    publishState.published = !published.value
    publishState.publishedAt = !publishState.published ? null : new Date().toISOString()
    await refreshGrades()
    saveMessage.value = published.value ? 'Nilai berhasil dipublish ke siswa.' : 'Publish dibatalkan.'
  } catch (e: unknown) { publishError.value = pesanDariError(e, 'Gagal mempublish nilai') } finally { publishing.value = false }
}

const calculating = ref(false)
const gradesError = ref('')
const calcMessage = ref('')

const feedbackEdit = reactive<Record<string, string>>({})

function typeLabel(t: string): string {
  const map: Record<string, string> = {
    text: 'Materi Bacaan', file: 'File', video: 'Video',
    quiz: 'Kuis', assignment: 'Tugas', forum: 'Forum', presentation: 'Presentasi',
  }
  return map[t] ?? t
}

function gradeClass(grade: string): string {
  switch (grade) {
    case 'A': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
    case 'B': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
    case 'C': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
    case 'D': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
    default: return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
  }
}

function parseComponents(raw: string | null): Record<string, { average: number; count: number; weight: number }> {
  try { return raw ? JSON.parse(raw) : {} } catch { return {} }
}

function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '-'
  const d = new Date(value)
  return d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
}

async function saveWeights() {
  weightsError.value = ''
  saveMessage.value = ''
  savingWeight.value = true
  try {
    const payload: Record<string, number> = {}
    for (const t of types.value) payload[t] = Number(form[t] || 0)
    await $fetch(`/api/courses/${courseId.value}/grade-weights`, { method: 'PUT', body: { weights: payload } })
    saveMessage.value = 'Bobot nilai berhasil disimpan.'
  } catch (e: unknown) {
    weightsError.value = pesanDariError(e, 'Gagal menyimpan bobot nilai')
  } finally {
    savingWeight.value = false
  }
}

async function calculateGrades() {
  gradesError.value = ''
  calcMessage.value = ''
  calculating.value = true
  try {
    const res = await $fetch<{ data: { version: number; count: number } }>(`/api/courses/${courseId.value}/final-grades/calculate`, { method: 'POST' })
    calcMessage.value = `Nilai akhir diperbarui (versi ${res.data.version}, ${res.data.count} siswa).`
    await refreshGrades()
  } catch (e: unknown) {
    gradesError.value = pesanDariError(e, 'Gagal menghitung nilai akhir')
  } finally {
    calculating.value = false
  }
}

async function updateFeedback(row: any) {
  try {
    await $fetch(`/api/courses/${courseId.value}/final-grades/${row.studentId}`, {
      method: 'PATCH',
      body: { feedback: feedbackEdit[row.studentId] ?? '' },
    })
    row.feedback = feedbackEdit[row.studentId] ?? ''
    saveMessage.value = `Feedback untuk ${row.name} berhasil disimpan.`
    gradesError.value = ''
  } catch (e: unknown) {
    gradesError.value = pesanDariError(e, 'Gagal menyimpan feedback')
  }
}
</script>
