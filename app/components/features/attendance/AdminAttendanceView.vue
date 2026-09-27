<script setup lang="ts">
import { buildCsv, downloadCsv } from '~/utils/csv'

type AttendanceRow = { id: string; studentId: string; studentName: string; nis: string; classId: string; className: string; subjectId: string | null; subjectName: string | null; date: string; status: string; note: string | null }
type StudentRow = { id: string; name: string; nis: string; classId: string; className?: string | null; summary?: AttendanceSummary }
type AttendanceSummary = { present: number; late: number; excused: number; sick: number; absent: number; total: number }
type SubjectRow = { id: string; name: string }
type ClassRow = { id: string; name: string }

const STATUS = ['present', 'late', 'excused', 'sick', 'absent'] as const
type Status = typeof STATUS[number]

const { isAdmin } = useAuth()
const { confirm } = useConfirm()

const dateFilter = ref(new Date().toISOString().slice(0, 10))
const fromFilter = ref('')
const toFilter = ref('')
const studentPage = ref(1)
const perPage = ref(50)
const studentSearch = ref('')
const classIdFilter = ref('')
const subjectIdFilter = ref('')
const message = ref('')
const error = ref('')
const saving = ref(false)

// Pasangan (kelas, mapel) yang boleh diakses guru. all=true untuk admin.
const { data: scopeData } = await useFetch<{ data: { classId: string; subjectId: string }[] | null; all: boolean }>('/api/attendance/scopes')
const scopeAll = computed(() => scopeData.value?.all === true)
const scopePairs = computed(() => scopeData.value?.data ?? [])
const allowedClassIds = computed(() => new Set(scopePairs.value.map((s) => s.classId)))

const { data: classesData } = await useFetch<{ data: ClassRow[] }>('/api/classes')
const classes = computed(() => {
  const all = classesData.value?.data ?? []
  return scopeAll.value ? all : all.filter((c) => allowedClassIds.value.has(c.id))
})
const { data: subjectsData } = await useFetch<{ data: SubjectRow[] }>('/api/subjects')
const subjects = computed(() => subjectsData.value?.data ?? [])

// Mapel yang tersedia untuk kelas terpilih (guru hanya yang diampu).
const availableSubjects = computed(() => {
  if (scopeAll.value) return subjects.value
  const ids = new Set(scopePairs.value.filter((s) => s.classId === classIdFilter.value).map((s) => s.subjectId))
  return subjects.value.filter((s) => ids.has(s.id))
})

const selectedClassId = computed(() => classIdFilter.value || classes.value[0]?.id || '')
// Saat mencari, pencarian lintas kelas. Tanpa pencarian, tabel mengikuti kelas terpilih.
const attendanceClassFilter = computed(() => studentSearch.value ? '' : classIdFilter.value)

// Sinkronkan pilihan kelas/mapel agar selalu valid.
watchEffect(() => {
  if (!classIdFilter.value && classes.value.length) classIdFilter.value = classes.value[0]!.id
  if (subjectIdFilter.value && !availableSubjects.value.some((s) => s.id === subjectIdFilter.value)) subjectIdFilter.value = ''
  if (!subjectIdFilter.value && availableSubjects.value.length) subjectIdFilter.value = availableSubjects.value[0]!.id
})

const { data: studentsData } = await useFetch<{ data: StudentRow[]; meta: { page: number; perPage: number; total: number; totalPages: number } }>(
  '/api/attendance/students',
  { query: computed(() => ({ page: studentPage.value, perPage: perPage.value, q: studentSearch.value, classId: attendanceClassFilter.value })), watch: [studentPage, perPage, studentSearch, attendanceClassFilter] },
)
const studentMeta = computed(() => studentsData.value?.meta ?? { page: 1, perPage: 50, total: 0, totalPages: 1 })

// Kembali ke halaman 1 saat kelas/pencarian/jumlah baris berganti.
watch([selectedClassId, perPage, studentSearch], () => { studentPage.value = 1 })

// ----- Rekap per siswa (mengikuti filter kelas/mapel/rentang tanggal) -----
const { data: rekapData } = await useFetch<{ data: { studentId: string; present: number; late: number; excused: number; sick: number; absent: number; total: number }[] }>(
  '/api/attendance/summary',
  { query: computed(() => ({ classId: classIdFilter.value, subjectId: subjectIdFilter.value, from: fromFilter.value, to: toFilter.value })), watch: [classIdFilter, subjectIdFilter, fromFilter, toFilter] },
)
const rekapByStudent = computed(() => new Map((rekapData.value?.data ?? []).map((r) => [r.studentId, r])))
const emptyRekap = { present: 0, late: 0, excused: 0, sick: 0, absent: 0, total: 0 }

const students = computed(() => (studentsData.value?.data ?? []).map((s) => ({ ...s, summary: rekapByStudent.value.get(s.id) ?? emptyRekap })))

// Grid per (kelas, mapel, tanggal) selalu dibatasi ukuran kelas → ambil sekali (tanpa paginasi),
// lalu paginasi dilakukan pada daftar SISWA agar baris grid selalu sinkron.
const { data, pending, refresh } = await useFetch<{ data: AttendanceRow[]; summary: Record<string, number> }>('/api/attendance', {
  query: computed(() => ({ date: dateFilter.value, classId: classIdFilter.value, subjectId: subjectIdFilter.value, perPage: 500, page: 1 })),
  watch: [dateFilter, classIdFilter, subjectIdFilter],
})
const rows = computed(() => data.value?.data ?? [])
const summary = computed(() => data.value?.summary ?? { present: 0, late: 0, excused: 0, sick: 0, absent: 0, total: 0 })
const byStudent = computed(() => new Map(rows.value.map((r) => [r.studentId, r])))

// Matriks absensi: semua siswa kelas + status per mapel terpilih.
const grid = computed(() => students.value.map((s) => ({ student: s, record: byStudent.value.get(s.id) ?? null })))

async function markAll(status: Status) {
  if (!selectedClassId.value || !subjectIdFilter.value) return
  saving.value = true; message.value = ''; error.value = ''
  try {
    await $fetch('/api/attendance/bulk', { method: 'POST', body: { classId: selectedClassId.value, subjectId: subjectIdFilter.value, date: dateFilter.value, status } })
    await refresh()
    message.value = `Semua siswa ditandai "${statusLabel(status)}" untuk mapel ${subjectLabel.value}.`
  } catch (e: any) { error.value = e.data?.statusMessage ?? 'Gagal menyimpan absensi.' } finally { saving.value = false }
}

async function saveStatus(studentId: string, status: Status) {
  if (!subjectIdFilter.value) return
  saving.value = true; message.value = ''; error.value = ''
  try {
    await $fetch('/api/attendance', { method: 'POST', body: { studentId, subjectId: subjectIdFilter.value, date: dateFilter.value, status } })
    await refresh()
  } catch (e: any) { error.value = e.data?.statusMessage ?? 'Gagal menyimpan absensi.' } finally { saving.value = false }
}

async function saveNote(item: AttendanceRow, note: string) {
  if (!item.subjectId) return
  try {
    await $fetch('/api/attendance', { method: 'POST', body: { studentId: item.studentId, subjectId: item.subjectId, date: item.date, status: item.status, note } })
    await refresh()
    message.value = `Catatan ${item.studentName} disimpan.`
  } catch (e: any) { error.value = e.data?.statusMessage ?? 'Gagal menyimpan catatan.' }
}

async function remove(item: AttendanceRow) {
  if (!isAdmin.value || !await confirm({ title: 'Hapus absensi?', message: `Hapus absensi ${item.studentName} pada ${item.date}?`, confirmLabel: 'Ya, hapus', tone: 'danger' })) return
  try { await $fetch(`/api/attendance/${item.id}`, { method: 'DELETE' }); await refresh(); message.value = 'Absensi dihapus.' }
  catch (e: any) { error.value = e.data?.statusMessage ?? 'Gagal menghapus absensi.' }
}

function exportCsv() {
  const filterLabel = fromFilter.value || toFilter.value ? `${fromFilter.value || 'awal'}-${toFilter.value || 'akhir'}` : dateFilter.value
  const header = fromFilter.value || toFilter.value
    ? ['Nama', 'NIS', 'Kelas', 'Mapel', 'Dari', 'Sampai', 'Hadir', 'Terlambat', 'Izin', 'Sakit', 'Alpa', 'Total']
    : ['Nama', 'NIS', 'Kelas', 'Mapel', 'Tanggal', 'Status', 'Keterangan']
  const body = fromFilter.value || toFilter.value
    ? grid.value.map((g) => { const s = g.student.summary ?? emptyRekap; return [g.student.name, g.student.nis, selectedClassLabel.value, subjectLabel.value, fromFilter.value || '-', toFilter.value || '-', s.present, s.late, s.excused, s.sick, s.absent, s.total] })
    : grid.value.map((g) => [g.student.name, g.student.nis, selectedClassLabel.value, subjectLabel.value, dateFilter.value, g.record ? statusLabel(g.record.status) : '-', g.record?.note ?? ''])
  downloadCsv(`absensi-${selectedClassLabel.value}-${subjectLabel.value}-${filterLabel}.csv`, buildCsv([header, ...body]))
}

const selectedClassLabel = computed(() => classes.value.find((c) => c.id === classIdFilter.value)?.name ?? '-')
const subjectLabel = computed(() => subjects.value.find((s) => s.id === subjectIdFilter.value)?.name ?? '-')
const statusLabel = (s: string) => ({ present: 'Hadir', late: 'Terlambat', excused: 'Izin', sick: 'Sakit', absent: 'Alpa' }[s] || s)
const statusClass = (s: string) => ({
  present: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
  late: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
  excused: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  sick: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
  absent: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
}[s] || 'bg-slate-100 text-slate-600')

// Reset kehadiran semua siswa (hapus catatan hari itu untuk mapel terpilih) — admin saja.
async function resetSubject() {
  if (!isAdmin.value || !await confirm({ title: 'Reset absensi?', message: 'Hapus semua catatan absensi mapel ini pada tanggal terpilih?', confirmLabel: 'Ya, reset', tone: 'danger' })) return
  saving.value = true; message.value = ''; error.value = ''
  try {
    await Promise.all(rows.value.map((r) => $fetch(`/api/attendance/${r.id}`, { method: 'DELETE' })))
    await refresh()
    message.value = 'Catatan absensi mapel dihapus.'
  } catch (e: any) { error.value = e.data?.statusMessage ?? 'Gagal menghapus.' } finally { saving.value = false }
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-slate-800 dark:text-slate-100">Absensi per Mata Pelajaran</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Pilih kelas &amp; mapel, lalu tandai kehadiran siswa.</p>
      </div>
      <div class="flex gap-2">
        <button class="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-sm font-semibold text-slate-700 dark:text-slate-200" @click="exportCsv">Export CSV</button>
        <button v-if="isAdmin" :disabled="saving || !rows.length" class="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold disabled:opacity-50" @click="resetSubject">Reset Mapel</button>
      </div>
    </div>

    <div class="flex flex-wrap gap-3">
      <input v-model="dateFilter" type="date" class="h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm">
      <input v-model="fromFilter" type="date" title="Tanggal mulai rekap" class="h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm">
      <input v-model="toFilter" type="date" title="Tanggal akhir rekap" class="h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm">
      <select v-model="classIdFilter" class="h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm">
        <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
      <select v-model="subjectIdFilter" class="h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm">
        <option value="" disabled>Pilih Mapel</option>
        <option v-for="s in availableSubjects" :key="s.id" :value="s.id">{{ s.name }}</option>
      </select>
      <input v-model="studentSearch" type="search" placeholder="Cari nama/NIS..." class="h-10 w-52 px-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm">
      <select v-model="perPage" class="h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"><option :value="50">50 siswa</option><option :value="100">100 siswa</option><option :value="150">150 siswa</option><option :value="200">200 siswa</option></select>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <div class="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3"><p class="text-xs text-slate-500 dark:text-slate-400">Total</p><p class="text-xl font-bold text-slate-800 dark:text-slate-100">{{ summary.total }}</p></div>
      <div class="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3"><p class="text-xs text-emerald-600 dark:text-emerald-400">Hadir</p><p class="text-xl font-bold text-emerald-700 dark:text-emerald-300">{{ summary.present }}</p></div>
      <div class="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3"><p class="text-xs text-amber-600 dark:text-amber-400">Terlambat</p><p class="text-xl font-bold text-amber-700 dark:text-amber-300">{{ summary.late }}</p></div>
      <div class="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-4 py-3"><p class="text-xs text-blue-600 dark:text-blue-400">Izin</p><p class="text-xl font-bold text-blue-700 dark:text-blue-300">{{ summary.excused }}</p></div>
      <div class="rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 px-4 py-3"><p class="text-xs text-purple-600 dark:text-purple-400">Sakit</p><p class="text-xl font-bold text-purple-700 dark:text-purple-300">{{ summary.sick }}</p></div>
      <div class="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3"><p class="text-xs text-red-600 dark:text-red-400">Alpa</p><p class="text-xl font-bold text-red-700 dark:text-red-300">{{ summary.absent }}</p></div>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <span class="text-xs text-slate-500 dark:text-slate-400 mr-1">Tandai semua:</span>
      <button v-for="s in STATUS" :key="s" :disabled="saving || !subjectIdFilter" class="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50" :class="statusClass(s)" @click="markAll(s)">{{ statusLabel(s) }}</button>
    </div>

    <div v-if="message" class="rounded-lg bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">{{ message }}</div>
    <div v-if="error" class="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">{{ error }}</div>

    <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
      <div v-if="pending" class="p-8 text-center text-sm text-slate-500 dark:text-slate-400">Memuat data...</div>
      <div v-else-if="!subjectIdFilter" class="p-8 text-center text-sm text-slate-500 dark:text-slate-400">Pilih kelas &amp; mata pelajaran terlebih dahulu.</div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 dark:bg-slate-800/50 border-b dark:border-slate-700">
            <tr>
              <th class="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400 w-10">#</th>
              <th class="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Nama</th>
              <th class="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">NIS</th>
              <th class="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Rekap (H/T/I/S/A)</th>
              <th class="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Status</th>
              <th class="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400 w-56">Keterangan</th>
              <th v-if="isAdmin" class="text-right px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(g, i) in grid" :key="g.student.id" class="border-b dark:border-slate-700 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
              <td class="px-4 py-3 text-slate-400">{{ (studentMeta.page - 1) * studentMeta.perPage + i + 1 }}</td>
              <td class="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{{ g.student.name }}</td>
              <td class="px-4 py-3 text-slate-600 dark:text-slate-300">{{ g.student.nis }}</td>
              <td class="px-4 py-3">
                <span v-if="g.student.summary && g.student.summary.total" class="text-xs text-slate-500 dark:text-slate-400" :title="`Hadir ${g.student.summary.present}, Terlambat ${g.student.summary.late}, Izin ${g.student.summary.excused}, Sakit ${g.student.summary.sick}, Alpa ${g.student.summary.absent}`">
                  <span class="text-emerald-600 font-medium">{{ g.student.summary.present }}</span>/<span class="text-amber-600 font-medium">{{ g.student.summary.late }}</span>/<span class="text-blue-600 font-medium">{{ g.student.summary.excused }}</span>/<span class="text-purple-600 font-medium">{{ g.student.summary.sick }}</span>/<span class="text-red-600 font-medium">{{ g.student.summary.absent }}</span>
                </span>
                <span v-else class="text-xs text-slate-400">-</span>
              </td>
              <td class="px-4 py-3">
                <div class="flex flex-wrap gap-1.5">
                  <button v-for="s in STATUS" :key="s" :disabled="saving" class="px-2.5 py-1 rounded text-xs font-medium border border-transparent disabled:opacity-50"
                    :class="g.record?.status === s ? statusClass(s) : 'bg-slate-50 dark:bg-slate-700/40 text-slate-400 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'"
                    @click="saveStatus(g.student.id, s)">{{ statusLabel(s) }}</button>
                </div>
              </td>
              <td class="px-4 py-3">
                <input :value="g.record?.note ?? ''" :disabled="!g.record" class="h-9 w-full px-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm disabled:opacity-50" placeholder="-" @change="g.record && saveNote(g.record, ($event.target as HTMLInputElement).value)">
              </td>
              <td v-if="isAdmin" class="px-4 py-3 text-right">
                <button v-if="g.record" class="text-red-600" @click="remove(g.record)">Hapus</button>
              </td>
            </tr>
            <tr v-if="!grid.length"><td colspan="7" class="px-4 py-8 text-center text-slate-500 dark:text-slate-400">Tidak ada siswa.</td></tr>
          </tbody>
        </table>
      </div>
      <div v-if="studentMeta.totalPages > 1" class="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
        <span class="text-xs text-slate-500 dark:text-slate-400">{{ (studentMeta.page - 1) * studentMeta.perPage + 1 }}–{{ Math.min(studentMeta.page * studentMeta.perPage, studentMeta.total) }} dari {{ studentMeta.total }} siswa</span>
        <div class="flex items-center gap-2">
          <button class="px-3 py-1.5 rounded border text-xs disabled:opacity-50" :disabled="studentMeta.page <= 1" @click="studentPage--">Sebelumnya</button>
          <span class="text-xs text-slate-600 dark:text-slate-300">{{ studentMeta.page }} / {{ studentMeta.totalPages }}</span>
          <button class="px-3 py-1.5 rounded border text-xs disabled:opacity-50" :disabled="studentMeta.page >= studentMeta.totalPages" @click="studentPage++">Berikutnya</button>
        </div>
      </div>
    </div>
  </div>
</template>
