<script setup lang="ts">
const { user } = useAuth()
type Child = {
  id: string; name: string; nis: string | null; className: string | null
  attendance: { status: string; total: number }[]
  grades: { courseId: string; courseName: string; score: number; grade: string; feedback: string | null }[]
}
const { data, pending, error, refresh } = await useFetch<{ data: Child[]; message?: string }>('/api/parent/dashboard')
const children = computed(() => data.value?.data ?? [])
const selectedId = ref('')
watch(children, (rows) => { if (!selectedId.value && rows.length) selectedId.value = rows[0]!.id }, { immediate: true })
const selected = computed(() => children.value.find((child) => child.id === selectedId.value) ?? null)
const statusLabel: Record<string, string> = { present: 'Hadir', late: 'Terlambat', excused: 'Izin', sick: 'Sakit', absent: 'Alpa' }
const attendanceTotal = computed(() => selected.value?.attendance.reduce((sum, row) => sum + Number(row.total), 0) ?? 0)
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-start justify-between">
      <div>
        <h1 class="text-2xl font-bold text-slate-800 dark:text-slate-100">Hai, {{ user?.name }}</h1>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Pantau aktivitas belajar anak Anda di sini.</p>
      </div>
      <span class="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">Orang Tua</span>
    </div>

    <div v-if="pending" class="h-40 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-700" />
    <div v-else-if="error" class="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
      Gagal memuat data anak. <button class="font-semibold underline" @click="refresh()">Coba lagi</button>
    </div>
    <div v-else-if="!children.length" class="rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-800">
      <Icon name="heroicons:users" class="mx-auto h-10 w-10 text-emerald-500" />
      <h2 class="mt-3 text-lg font-bold text-slate-800 dark:text-slate-100">Data anak belum terhubung</h2>
      <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">Minta admin sekolah menghubungkan akun Anda ke data siswa.</p>
    </div>
    <template v-else>
      <label class="block max-w-md text-sm font-medium text-slate-700 dark:text-slate-300">
        Pilih anak
        <select v-model="selectedId" class="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800">
          <option v-for="child in children" :key="child.id" :value="child.id">{{ child.name }}{{ child.className ? ` · ${child.className}` : '' }}</option>
        </select>
      </label>
      <div v-if="selected" class="grid gap-5 lg:grid-cols-2">
        <section class="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
          <h2 class="font-semibold text-slate-800 dark:text-slate-100">Absensi</h2>
          <p class="mt-1 text-sm text-slate-500">{{ attendanceTotal }} catatan tercatat.</p>
          <div class="mt-4 space-y-2">
            <div v-for="row in selected.attendance" :key="row.status" class="flex justify-between text-sm"><span>{{ statusLabel[row.status] ?? row.status }}</span><b>{{ row.total }}</b></div>
          </div>
        </section>
        <section class="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
          <h2 class="font-semibold text-slate-800 dark:text-slate-100">Nilai akhir</h2>
          <p v-if="!selected.grades.length" class="mt-3 text-sm text-slate-500">Belum ada nilai yang dipublish.</p>
          <div v-else class="mt-4 space-y-3">
            <div v-for="grade in selected.grades" :key="grade.courseId" class="flex items-center justify-between border-b border-slate-100 pb-2 text-sm dark:border-slate-700"><span>{{ grade.courseName }}</span><b>{{ grade.score }} ({{ grade.grade }})</b></div>
          </div>
        </section>
      </div>
    </template>
  </div>
</template>
