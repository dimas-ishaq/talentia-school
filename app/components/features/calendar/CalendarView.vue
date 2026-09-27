<script setup lang="ts">
type EventType = 'exam' | 'holiday' | 'activity' | 'meeting' | 'competition' | 'semester_start' | 'semester_end' | 'break' | 'other'
type CalendarEvent = {
  id: string; title: string; description: string | null; startDate: string; endDate: string | null
  location: string | null; type: EventType; category: string | null; isHoliday: boolean
  visibility: 'public' | 'internal' | 'private'; color: string | null; source?: 'manual' | 'exam'
}

const props = defineProps<{ canEdit: boolean }>()
const { user } = useAuth()
const { confirm } = useConfirm()
const month = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
const selectedType = ref('')
const showModal = ref(false)
const editingId = ref<string | null>(null)
const saving = ref(false)
const errorMessage = ref('')

const typeMeta: Record<EventType, { label: string; color: string }> = {
  exam: { label: 'Ujian / Asesmen', color: '#ef4444' }, holiday: { label: 'Hari Libur', color: '#f43f5e' },
  activity: { label: 'Kegiatan Sekolah', color: '#10b981' }, meeting: { label: 'Rapat / Raker', color: '#6366f1' },
  competition: { label: 'Lomba / Kompetisi', color: '#f59e0b' }, semester_start: { label: 'Awal Semester', color: '#0ea5e9' },
  semester_end: { label: 'Akhir Semester', color: '#8b5cf6' }, break: { label: 'Libur Semester', color: '#14b8a6' },
  other: { label: 'Lainnya', color: '#64748b' },
}
const types = Object.entries(typeMeta) as [EventType, { label: string; color: string }][]
const form = reactive({ title: '', description: '', startDate: '', endDate: '', location: '', type: 'activity' as EventType, category: '', isHoliday: false, visibility: 'public' as 'public' | 'internal' | 'private', color: '#10b981' })

const monthLabel = computed(() => month.value.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }))
const range = computed(() => {
  const y = month.value.getFullYear(); const m = month.value.getMonth()
  return { from: `${y}-${String(m + 1).padStart(2, '0')}-01`, to: `${y}-${String(m + 1).padStart(2, '0')}-${String(new Date(y, m + 1, 0).getDate()).padStart(2, '0')}` }
})
const query = computed(() => ({
  ...range.value,
  includeInternal: ['admin', 'teacher'].includes(user.value?.role ?? '') ? '1' : undefined,
  includePrivate: user.value?.role === 'admin' ? '1' : undefined,
}))
const { data, pending, refresh } = await useFetch<{ data: CalendarEvent[] }>('/api/calendar', { query })
const events = computed(() => (data.value?.data ?? []).filter((e) => !selectedType.value || e.type === selectedType.value))

const calendarDays = computed(() => {
  const first = new Date(month.value.getFullYear(), month.value.getMonth(), 1)
  const start = (first.getDay() + 6) % 7
  const days = new Date(month.value.getFullYear(), month.value.getMonth() + 1, 0).getDate()
  return Array.from({ length: Math.ceil((start + days) / 7) * 7 }, (_, i) => {
    const date = new Date(month.value.getFullYear(), month.value.getMonth(), i - start + 1)
    const y = date.getFullYear(); const m = String(date.getMonth() + 1).padStart(2, '0'); const d = String(date.getDate()).padStart(2, '0')
    return { date, iso: `${y}-${m}-${d}`, current: date.getMonth() === month.value.getMonth() }
  })
})
const todayIso = (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}` })()
const eventsOn = (iso: string) => events.value.filter((e) => e.startDate <= iso && (e.endDate || e.startDate) >= iso)
const formatDate = (date: string | null) => date ? new Date(`${date}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'
const resetForm = () => Object.assign(form, { title: '', description: '', startDate: range.value.from, endDate: '', location: '', type: 'activity', category: '', isHoliday: false, visibility: 'public', color: '#10b981' })
const openCreate = (date?: string) => { editingId.value = null; resetForm(); if (date) form.startDate = date; showModal.value = true; errorMessage.value = '' }
const openEdit = (e: CalendarEvent) => { editingId.value = e.id; Object.assign(form, { title: e.title, description: e.description || '', startDate: e.startDate, endDate: e.endDate || '', location: e.location || '', type: e.type, category: e.category || '', isHoliday: e.isHoliday, visibility: e.visibility, color: e.color || typeMeta[e.type].color }); showModal.value = true; errorMessage.value = '' }
const changeType = () => { form.color = typeMeta[form.type].color; if (['holiday', 'break'].includes(form.type)) form.isHoliday = true }
const save = async () => {
  saving.value = true; errorMessage.value = ''
  try {
    await $fetch(editingId.value ? `/api/calendar/${editingId.value}` : '/api/calendar', {
      method: editingId.value ? 'PATCH' : 'POST',
      body: { ...form, endDate: form.endDate || null, description: form.description || null, location: form.location || null, category: form.category || null },
    })
    showModal.value = false
    await refresh()
  } catch (error: any) {
    errorMessage.value = error?.data?.statusMessage || 'Gagal menyimpan agenda.'
  } finally {
    saving.value = false
  }
}
const remove = async (e: CalendarEvent) => { if (!await confirm({ title: 'Hapus agenda?', message: `Hapus agenda “${e.title}”?`, confirmLabel: 'Ya, hapus', tone: 'danger' })) return; await $fetch(`/api/calendar/${e.id}`, { method: 'DELETE' }); await refresh() }
const shiftMonth = (delta: number) => { month.value = new Date(month.value.getFullYear(), month.value.getMonth() + delta, 1) }
const goToday = () => { month.value = new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-slate-800 dark:text-slate-100">Kalender Akademik</h1>
        <p class="mt-1 text-sm text-slate-500">Agenda pembelajaran, ujian, libur, dan kegiatan sekolah.</p>
      </div>
      <button v-if="props.canEdit" class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700" @click="openCreate()">+ Tambah Agenda</button>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
      <div class="flex items-center gap-2">
        <button class="rounded-lg border px-3 py-2 text-sm dark:border-slate-600" @click="shiftMonth(-1)">‹</button>
        <button class="rounded-lg border px-3 py-2 text-sm dark:border-slate-600" @click="goToday">Hari ini</button>
        <button class="rounded-lg border px-3 py-2 text-sm dark:border-slate-600" @click="shiftMonth(1)">›</button>
        <strong class="ml-2 capitalize text-slate-700 dark:text-slate-200">{{ monthLabel }}</strong>
      </div>
      <select v-model="selectedType" class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700">
        <option value="">Semua jenis agenda</option>
        <option v-for="([key, meta]) in types" :key="key" :value="key">{{ meta.label }}</option>
      </select>
    </div>

    <div v-if="pending" class="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800">Memuat kalender...</div>
    <div v-else class="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
      <div class="grid grid-cols-7 border-b bg-slate-50 text-center text-xs font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-700/50">
        <div v-for="day in ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']" :key="day" class="p-3">{{ day }}</div>
      </div>
      <div class="grid grid-cols-7">
        <button v-for="cell in calendarDays" :key="cell.iso" class="min-h-28 border-b border-r p-2 text-left align-top hover:bg-emerald-50/50 dark:border-slate-700 dark:hover:bg-slate-700/50" :class="!cell.current && 'bg-slate-50/60 text-slate-400 dark:bg-slate-900/30'" @dblclick="props.canEdit && openCreate(cell.iso)">
          <span class="text-xs font-semibold" :class="cell.iso === todayIso ? 'rounded-full bg-emerald-600 px-2 py-1 text-white' : ''">{{ cell.date.getDate() }}</span>
          <span v-for="e in eventsOn(cell.iso).slice(0, 3)" :key="e.id" class="mt-1 block truncate rounded px-1.5 py-1 text-[11px] font-medium text-white" :style="{ backgroundColor: e.color || typeMeta[e.type].color }" :title="e.title" @click.stop="props.canEdit && e.source !== 'exam' ? openEdit(e) : undefined">{{ e.title }}</span>
          <span v-if="eventsOn(cell.iso).length > 3" class="mt-1 block text-[10px] text-slate-500">+{{ eventsOn(cell.iso).length - 3 }} agenda</span>
        </button>
      </div>
    </div>

    <div class="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <h2 class="mb-3 font-semibold text-slate-800 dark:text-slate-100">Agenda bulan ini</h2>
      <div v-if="!events.length" class="text-sm text-slate-500">Belum ada agenda pada bulan ini.</div>
      <div v-for="e in events" :key="e.id" class="flex items-start justify-between gap-3 border-t border-slate-100 py-3 first:border-0 dark:border-slate-700">
        <div class="flex items-start gap-3">
          <span class="mt-1 h-3 w-3 shrink-0 rounded-full" :style="{ backgroundColor: e.color || typeMeta[e.type].color }" />
          <div>
            <p class="font-medium text-slate-800 dark:text-slate-100">
              {{ e.title }}
              <span v-if="e.isHoliday" class="ml-1 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">LIBUR</span>
              <span v-if="e.source === 'exam'" class="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">UJIAN</span>
            </p>
            <p class="text-xs text-slate-500">{{ formatDate(e.startDate) }}{{ e.endDate ? ` – ${formatDate(e.endDate)}` : '' }}<span v-if="e.location"> · {{ e.location }}</span><span v-if="e.category"> · {{ e.category }}</span></p>
            <p v-if="e.description" class="mt-1 text-sm text-slate-600 dark:text-slate-300">{{ e.description }}</p>
          </div>
        </div>
        <div v-if="props.canEdit && e.source !== 'exam'" class="flex shrink-0 gap-2">
          <button class="text-xs text-blue-600 hover:underline" @click="openEdit(e)">Edit</button>
          <button class="text-xs text-red-600 hover:underline" @click="remove(e)">Hapus</button>
        </div>
      </div>
    </div>

    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" @click.self="showModal = false">
      <form class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-5 shadow-xl dark:bg-slate-800" @submit.prevent="save">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-bold text-slate-800 dark:text-slate-100">{{ editingId ? 'Edit Agenda' : 'Tambah Agenda' }}</h2>
          <button type="button" class="text-2xl leading-none text-slate-400 hover:text-slate-600" @click="showModal = false">×</button>
        </div>
        <div v-if="errorMessage" class="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">{{ errorMessage }}</div>
        <div class="mt-4 grid gap-4 sm:grid-cols-2">
          <label class="sm:col-span-2">Judul agenda<input v-model="form.title" required maxlength="200" class="field" /></label>
          <label>Jenis agenda<select v-model="form.type" class="field" @change="changeType"><option v-for="([key, meta]) in types" :key="key" :value="key">{{ meta.label }}</option></select></label>
          <label>Kategori<input v-model="form.category" placeholder="Sekolah / Nasional / Ekstrakurikuler" class="field" /></label>
          <label>Tanggal mulai<input v-model="form.startDate" required type="date" class="field" /></label>
          <label>Tanggal selesai <span class="text-xs text-slate-400">(opsional)</span><input v-model="form.endDate" type="date" class="field" /></label>
          <label>Lokasi <span class="text-xs text-slate-400">(opsional)</span><input v-model="form.location" class="field" /></label>
          <label>Visibilitas<select v-model="form.visibility" class="field"><option value="public">Semua pengguna</option><option value="internal">Guru dan admin</option><option value="private">Admin saja</option></select></label>
          <label class="sm:col-span-2">Deskripsi <span class="text-xs text-slate-400">(opsional)</span><textarea v-model="form.description" rows="3" class="field" /></label>
          <label class="flex items-center gap-2 text-sm sm:col-span-2"><input v-model="form.isHoliday" type="checkbox" class="rounded" /> Menandai sebagai hari libur</label>
        </div>
        <div class="mt-5 flex justify-end gap-2">
          <button type="button" class="rounded-lg border border-slate-300 px-4 py-2 text-sm dark:border-slate-600" @click="showModal = false">Batal</button>
          <button :disabled="saving" class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">{{ saving ? 'Menyimpan...' : 'Simpan' }}</button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
@reference "~/assets/css/tailwind.css";
.field { @apply mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-700; }
label { @apply text-sm font-medium text-slate-700 dark:text-slate-200; }
</style>
