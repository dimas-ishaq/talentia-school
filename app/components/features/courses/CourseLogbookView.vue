<script setup lang="ts">
type Entry = { id: string; date: string; status: string; note: string | null; activityNote: string | null; learningNote: string | null; studentId: string; studentName: string | null; nis: string | null; className: string | null }

const props = defineProps<{ courseId: string }>()
const { isStudent } = useAuth()
const today = new Date().toISOString().slice(0, 10)
const STATUS = [
  { value: 'present', label: 'Hadir', icon: 'check-circle' },
  { value: 'late', label: 'Terlambat', icon: 'clock' },
  { value: 'excused', label: 'Izin', icon: 'document-text' },
  { value: 'sick', label: 'Sakit', icon: 'heart' },
] as const
const ALL_STATUS = [...STATUS, { value: 'absent', label: 'Alpa', icon: 'x-circle' }] as const
type Status = typeof ALL_STATUS[number]['value']

const filterFrom = ref(''); const filterTo = ref(''); const filterStudent = ref('')
const { data, pending, refresh } = await useFetch<{ data: Entry[]; summary: Record<string, number>; canManage: boolean }>(() => `/api/courses/${props.courseId}/attendance`, {
  key: `logbook-${props.courseId}`,
  query: computed(() => ({ from: filterFrom.value, to: filterTo.value, studentId: filterStudent.value })),
  watch: [filterFrom, filterTo, filterStudent],
})
const rows = computed(() => data.value?.data ?? [])
const summary = computed(() => data.value?.summary ?? { present: 0, late: 0, excused: 0, sick: 0, absent: 0, total: 0 })
const canManage = computed(() => data.value?.canManage === true)
const rate = computed(() => summary.value.total ? Math.round((((summary.value.present ?? 0) + (summary.value.late ?? 0)) / summary.value.total) * 100) : 0)
const todayRecord = computed(() => rows.value.find((r) => r.date === today))

// Daftar siswa unik untuk filter guru
const studentOptions = computed(() => {
  const map = new Map<string, string>()
  for (const r of rows.value) if (r.studentId) map.set(r.studentId, r.studentName ?? '-')
  return [...map.entries()].map(([id, name]) => ({ id, name }))
})

const open = ref(false)
const editing = ref<Entry | null>(null)
const form = reactive({ status: 'present' as Status, activityNote: '', learningNote: '' })
const saving = ref(false); const message = ref(''); const error = ref('')
const canSave = computed(() => !!form.activityNote.trim() || !!form.learningNote.trim())

function startFill() {
  editing.value = null
  form.status = (todayRecord.value?.status as Status) ?? 'present'
  form.activityNote = todayRecord.value?.activityNote ?? ''
  form.learningNote = todayRecord.value?.learningNote ?? ''
  message.value = ''; error.value = ''; open.value = true
}

function startEdit(entry: Entry) {
  editing.value = entry
  form.status = entry.status as Status
  form.activityNote = entry.activityNote ?? ''
  form.learningNote = entry.learningNote ?? ''
  message.value = ''; error.value = ''; open.value = true
}

async function save() {
  if (!canSave.value) { error.value = 'Isi kegiatan atau hal yang dipelajari terlebih dahulu.'; return }
  saving.value = true; error.value = ''
  try {
    if (editing.value) {
      await $fetch(`/api/courses/${props.courseId}/attendance/${editing.value.id}`, { method: 'PATCH', body: { status: form.status, activityNote: form.activityNote, learningNote: form.learningNote } })
      message.value = 'Logbook diperbarui.'
    } else {
      await $fetch(`/api/courses/${props.courseId}/attendance`, { method: 'POST', body: { date: today, status: form.status, activityNote: form.activityNote, learningNote: form.learningNote } })
      message.value = 'Logbook berhasil disimpan.'
    }
    await refresh(); open.value = false; editing.value = null
  } catch (e: any) { error.value = e.data?.statusMessage ?? e.data?.message ?? 'Gagal menyimpan logbook.' } finally { saving.value = false }
}

const label = (s: string) => ({ present: 'Hadir', late: 'Terlambat', excused: 'Izin', sick: 'Sakit', absent: 'Alpa' }[s] || s)
const badge = (s: string) => ({ present: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300', late: 'bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300', excused: 'bg-blue-50 text-blue-700 dark:bg-blue-400/10 dark:text-blue-300', sick: 'bg-violet-50 text-violet-700 dark:bg-violet-400/10 dark:text-violet-300', absent: 'bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300' }[s] || 'bg-slate-100 text-slate-600')
const formatDate = (d: string) => new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(`${d}T00:00:00`))
</script>

<template>
  <section class="space-y-5">
    <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 px-6 py-6 text-white shadow-lg shadow-indigo-200/40 dark:shadow-none">
      <div class="relative z-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div class="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold ring-1 ring-white/20"><Icon name="heroicons:book-open" /> Logbook Pembelajaran</div>
          <h2 class="text-2xl font-bold">Jurnal Kehadiran Harian</h2>
          <p class="mt-1 text-sm text-indigo-100">{{ isStudent ? 'Catat kehadiran dan hal yang kamu pelajari setiap hari.' : 'Pantau dan perbarui catatan logbook siswa.' }}</p>
        </div>
        <div class="rounded-2xl bg-white/15 px-5 py-3 text-center backdrop-blur-sm ring-1 ring-white/20"><p class="text-xs text-indigo-100">Kehadiran</p><p class="text-3xl font-bold">{{ rate }}<span class="text-lg">%</span></p></div>
      </div>
    </div>

    <div v-if="message" class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-400/10 dark:text-emerald-300">{{ message }}</div>

    <!-- Panel siswa: isi absensi hari ini -->
    <div v-if="isStudent" class="rounded-2xl border p-5 transition" :class="todayRecord ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-400/10' : 'border-indigo-100 bg-indigo-50/60 dark:border-indigo-900/50 dark:bg-indigo-400/10'">
      <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div class="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100"><Icon name="heroicons:calendar-days" class="text-indigo-600" /> Absensi Hari Ini</div>
          <template v-if="todayRecord">
            <div class="mt-2 flex flex-wrap items-center gap-2"><span :class="['inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold', badge(todayRecord.status)]">{{ label(todayRecord.status) }}</span><span class="text-sm text-slate-500">{{ formatDate(todayRecord.date) }}</span></div>
            <p v-if="todayRecord.activityNote" class="mt-2 text-sm text-slate-600 dark:text-slate-300"><b>Kegiatan:</b> {{ todayRecord.activityNote }}</p>
            <p v-if="todayRecord.learningNote" class="mt-1 text-sm text-slate-600 dark:text-slate-300"><b>Yang dipelajari:</b> {{ todayRecord.learningNote }}</p>
          </template>
          <p v-else class="mt-1 text-sm text-slate-500 dark:text-slate-400">Belum diisi untuk hari ini.</p>
        </div>
        <button class="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition" :class="todayRecord ? 'bg-slate-700 hover:bg-slate-800 shadow-slate-500/20' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20'" @click="startFill">
          <Icon :name="todayRecord ? 'heroicons:pencil-square' : 'heroicons:check-badge'" /> {{ todayRecord ? 'Edit Absensi' : 'Isi Absensi' }}
        </button>
      </div>
    </div>

    <!-- Filter (guru/admin) -->
    <div v-if="canManage" class="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <span class="text-xs font-semibold uppercase text-slate-400">Filter</span>
      <select v-model="filterStudent" class="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800"><option value="">Semua siswa</option><option v-for="s in studentOptions" :key="s.id" :value="s.id">{{ s.name }}</option></select>
      <input v-model="filterFrom" type="date" class="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800">
      <span class="text-slate-400">s/d</span>
      <input v-model="filterTo" type="date" class="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800">
      <button v-if="filterStudent || filterFrom || filterTo" class="text-xs font-medium text-indigo-600" @click="filterStudent = ''; filterFrom = ''; filterTo = ''">Reset</button>
    </div>

    <!-- Form isi/edit -->
    <div v-if="open" class="space-y-3 rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm dark:border-indigo-900/50 dark:bg-slate-800">
      <div class="flex items-center justify-between"><h3 class="font-bold text-slate-800 dark:text-slate-100">{{ editing ? `Perbarui Logbook · ${editing.studentName}` : 'Isi Logbook Hari Ini' }}</h3><button class="text-slate-400 hover:text-slate-600" @click="open = false"><Icon name="heroicons:x-mark" class="h-5 w-5" /></button></div>
      <div><p class="mb-2 text-xs font-semibold uppercase text-slate-500">Status kehadiran</p><div class="flex flex-wrap gap-2"><button v-for="s in (editing || canManage ? ALL_STATUS : STATUS)" :key="s.value" type="button" class="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition" :class="form.status === s.value ? 'border-indigo-500 bg-indigo-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300'" @click="form.status = s.value"><Icon :name="`heroicons:${s.icon}`" class="h-4 w-4" />{{ s.label }}</button></div></div>
      <input v-model="form.activityNote" class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-800" placeholder="Kegiatan hari ini (mis. Latihan soal bab 3)">
      <textarea v-model="form.learningNote" class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-800" rows="3" placeholder="Hal yang dipelajari / catatan refleksi..." />
      <p v-if="error" class="text-sm text-rose-600">{{ error }}</p>
      <div class="flex justify-end gap-2"><button class="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700" @click="open = false; editing = null">Batal</button><button :disabled="saving || !canSave" class="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50" @click="save">{{ saving ? 'Menyimpan...' : 'Simpan Logbook' }}</button></div>
    </div>

    <div class="grid grid-cols-2 gap-3 sm:grid-cols-5">
      <div v-for="item in [{ label: 'Hadir', value: summary.present, color: 'emerald' }, { label: 'Terlambat', value: summary.late, color: 'amber' }, { label: 'Izin', value: summary.excused, color: 'blue' }, { label: 'Sakit', value: summary.sick, color: 'violet' }, { label: 'Alpa', value: summary.absent, color: 'rose' }]" :key="item.label" class="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"><p class="text-xs font-medium text-slate-500">{{ item.label }}</p><p :class="`text-${item.color}-600`" class="mt-2 text-2xl font-bold">{{ item.value }}</p></div>
    </div>

    <div class="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div class="border-b border-slate-100 px-5 py-4 dark:border-slate-700"><h3 class="font-bold text-slate-800 dark:text-slate-100">Riwayat Logbook</h3><p class="mt-1 text-xs text-slate-500">Catatan harian pembelajaran</p></div>
      <div v-if="pending" class="p-10 text-center text-sm text-slate-500">Memuat...</div>
      <div v-else-if="!rows.length" class="p-10 text-center text-sm text-slate-500">Belum ada catatan logbook.</div>
      <ol v-else class="divide-y divide-slate-100 dark:divide-slate-700">
        <li v-for="r in rows" :key="r.id" class="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2"><span :class="['inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold', badge(r.status)]"><span class="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />{{ label(r.status) }}</span><span class="text-sm font-semibold text-slate-700 dark:text-slate-200">{{ formatDate(r.date) }}</span><span v-if="canManage" class="text-xs text-slate-400">· {{ r.studentName }} <span v-if="r.className">({{ r.className }})</span></span></div>
            <p v-if="r.activityNote" class="mt-2 text-sm text-slate-600 dark:text-slate-300"><b>Kegiatan:</b> {{ r.activityNote }}</p>
            <p v-if="r.learningNote" class="mt-1 text-sm text-slate-500 dark:text-slate-400"><b>Dipelajari:</b> {{ r.learningNote }}</p>
          </div>
          <button v-if="canManage" class="inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700" @click="startEdit(r)"><Icon name="heroicons:pencil-square" class="h-4 w-4" /> Perbarui</button>
        </li>
      </ol>
    </div>
  </section>
</template>