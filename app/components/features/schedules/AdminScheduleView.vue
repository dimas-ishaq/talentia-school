<!-- app/components/features/schedules/AdminScheduleView.vue
  Jadwal untuk ADMIN: CRUD + filter hari/kelas/guru/status. -->
<script setup lang="ts">
import type { ScheduleRow } from '~/types/schedule'
import { DAY_NAMES, DAYS } from '~/types/schedule'
import { pesanDariError } from '~/composables/useStudents'

const s = useSchedules()

// ----- Data master untuk dropdown form -----
const { data: kelasData } = await useFetch<{ data: { id: string; name: string; level: number; isActive: boolean }[] }>('/api/classes')
const kelas = computed(() => kelasData.value?.data.filter(k => k.isActive) ?? [])

const { data: mapelData } = await useFetch<{ data: { id: string; code: string; name: string; isActive: boolean }[] }>('/api/subjects')
const mapel = computed(() => mapelData.value?.data.filter(m => m.isActive) ?? [])

const { data: guruData } = await useFetch<{ data: { id: string; name: string; isActive: boolean }[] }>('/api/teachers')
const guru = computed(() => guruData.value?.data.filter(g => g.isActive) ?? [])

// ----- Filter guru (untuk select, tanpa duplikat) -----
const filterGuru = computed(() => guru.value)

// ----- Modal -----
const showModal = ref(false)
const editingItem = ref<ScheduleRow | null>(null)

function openCreate() {
  editingItem.value = null
  showModal.value = true
}

function openEdit(item: ScheduleRow) {
  editingItem.value = item
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingItem.value = null
}

async function onSaved() {
  const wasEditing = editingItem.value !== null
  await s.refresh()
  closeModal()
  s.pesanSukses.value = wasEditing ? 'Jadwal berhasil diupdate.' : 'Jadwal berhasil ditambahkan.'
}

const showImportModal = ref(false)

function handleImportSuccess() {
  s.refresh()
}
</script>

<template>
  <div class="space-y-5">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-slate-800 dark:text-slate-100">Jadwal Pelajaran</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Kelola jadwal mingguan per kelas</p>
      </div>
      <div class="flex items-center gap-2">
        <!-- Toggle status: semua / aktif saja -->
        <div class="inline-flex items-center gap-1 p-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium">
          <button
            class="px-3 py-1.5 rounded-md transition-colors"
            :class="s.showInactive.value ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'"
            @click="s.showInactive.value = true"
          >Semua</button>
          <button
            class="px-3 py-1.5 rounded-md transition-colors"
            :class="!s.showInactive.value ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'"
            @click="s.showInactive.value = false"
          >Aktif</button>
        </div>
        <button
          class="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          @click="showImportModal = true"
        >
          <Icon name="heroicons:arrow-up-tray" class="w-4 h-4" /> Import CSV
        </button>
        <button
          class="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 text-white text-sm font-semibold rounded-lg hover:bg-emerald-600 transition-colors shadow-sm shadow-emerald-500/30"
          @click="openCreate"
        >
          <Icon name="heroicons:plus-20-solid" class="w-4 h-4" /> Tambah Jadwal
        </button>
      </div>
    </div>

    <!-- Toast -->
    <div v-if="s.pesanSukses.value" class="flex items-center justify-between gap-3 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-lg px-4 py-3 text-sm text-emerald-800 dark:text-emerald-300">
      <span>{{ s.pesanSukses.value }}</span>
      <button class="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-200 font-bold" @click="s.tutupToast()"><Icon name="heroicons:x-mark" class="h-4 w-4" /></button>
    </div>
    <div v-if="s.pesanError.value" class="flex items-center justify-between gap-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 text-sm text-red-700 dark:text-red-300">
      <span>{{ s.pesanError.value }}</span>
      <button class="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-200 font-bold" @click="s.tutupToast()"><Icon name="heroicons:x-mark" class="h-4 w-4" /></button>
    </div>

    <!-- Filter bar -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div>
        <label class="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Hari</label>
        <select v-model="s.dayOfWeek.value" class="w-full h-9 px-3 text-sm rounded-lg border bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <option value="">Semua Hari</option>
          <option v-for="d in DAYS" :key="d.value" :value="d.value">{{ d.label }}</option>
        </select>
      </div>
      <div>
        <label class="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Kelas</label>
        <select v-model="s.classId.value" class="w-full h-9 px-3 text-sm rounded-lg border bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <option value="">Semua Kelas</option>
          <option v-for="k in kelas" :key="k.id" :value="k.id">{{ k.name }}</option>
        </select>
      </div>
      <div>
        <label class="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Guru</label>
        <select v-model="s.teacherId.value" class="w-full h-9 px-3 text-sm rounded-lg border bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <option value="">Semua Guru</option>
          <option v-for="g in filterGuru" :key="g.id" :value="g.id">{{ g.name }}</option>
        </select>
      </div>
      <div class="flex items-end">
        <button class="h-9 px-4 text-sm font-medium text-slate-600 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700" @click="s.dayOfWeek.value = ''; s.classId.value = ''; s.teacherId.value = ''; s.showInactive.value = true">
          Reset Filter
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="s.pending.value" class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
      <div class="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
      <p class="mt-3 text-sm text-slate-500 dark:text-slate-400">Memuat data...</p>
    </div>

    <!-- Error -->
    <div v-else-if="s.error.value" class="bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 p-6 text-center">
      <p class="text-red-600 dark:text-red-400 font-medium">Gagal memuat data</p>
      <button class="mt-3 text-sm text-red-600 dark:text-red-400 hover:underline" @click="s.refresh()">Coba lagi</button>
    </div>

    <!-- Empty -->
    <div v-else-if="s.schedules.value.length === 0" class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
      <Icon name="heroicons:calendar-days" class="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
      <p class="text-slate-600 dark:text-slate-300 font-medium">Belum ada jadwal</p>
      <p class="text-sm text-slate-400 dark:text-slate-500 mt-1">Tambahkan jadwal pertama atau ubah filter di atas</p>
      <button class="mt-4 px-4 py-2 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600" @click="openCreate">
        + Tambah Jadwal
      </button>
    </div>

    <!-- Table -->
    <div v-else class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th class="text-left font-medium text-slate-600 dark:text-slate-400 px-4 py-3">Hari</th>
              <th class="text-left font-medium text-slate-600 dark:text-slate-400 px-4 py-3">Jam</th>
              <th class="text-left font-medium text-slate-600 dark:text-slate-400 px-4 py-3">Mapel</th>
              <th class="text-left font-medium text-slate-600 dark:text-slate-400 px-4 py-3">Kelas</th>
              <th class="text-left font-medium text-slate-600 dark:text-slate-400 px-4 py-3">Guru</th>
              <th class="text-left font-medium text-slate-600 dark:text-slate-400 px-4 py-3">Ruangan</th>
              <th class="text-left font-medium text-slate-600 dark:text-slate-400 px-4 py-3">Status</th>
              <th class="text-right font-medium text-slate-600 dark:text-slate-400 px-4 py-3 w-32">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in s.schedules.value"
              :key="item.id"
              class="border-b border-slate-100 dark:border-slate-700 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              :class="!item.isActive ? 'opacity-50' : ''"
            >
              <td class="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">{{ DAY_NAMES[item.dayOfWeek] }}</td>
              <td class="px-4 py-3 text-slate-500 dark:text-slate-400 font-mono text-xs">{{ item.startTime }}–{{ item.endTime }}</td>
              <td class="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                {{ item.subjectName }}
                <span class="ml-1 inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">{{ item.subjectCode }}</span>
              </td>
              <td class="px-4 py-3 text-slate-600 dark:text-slate-300">{{ item.className }}</td>
              <td class="px-4 py-3 text-slate-600 dark:text-slate-300">{{ item.teacherName || '-' }}</td>
              <td class="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">{{ item.room || '-' }}</td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <StatusSwitch :active="item.isActive" :loading="s.togglingId.value === item.id" @toggle="s.toggleStatus(item)" />
                  <span class="text-xs font-medium" :class="item.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'">
                    {{ item.isActive ? 'Aktif' : 'Nonaktif' }}
                  </span>
                </div>
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center justify-end gap-1">
                  <button class="px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors" @click="openEdit(item)">Edit</button>
                  <button class="px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors" @click="s.mintaHapus(item)">Hapus</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal form -->
    <ScheduleFormModal
      v-if="showModal"
      :editing="editingItem"
      :kelas="kelas"
      :mapel="mapel"
      :guru="guru"
      @close="closeModal"
      @saved="onSaved"
    />

    <!-- Modal import CSV -->
    <ScheduleImportModal :open="showImportModal" @close="showImportModal = false" @imported="handleImportSuccess" />

    <!-- Modal konfirmasi hapus -->
    <Teleport to="body">
      <div v-if="s.itemYangDihapus.value" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" @click.self="s.batalHapus()">
        <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
          <div class="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-3 text-xl">!</div>
          <h2 class="font-bold text-slate-800 dark:text-slate-100">Hapus jadwal ini?</h2>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
            <b>{{ s.itemYangDihapus.value.subjectName }}</b> kelas
            <b>{{ s.itemYangDihapus.value.className }}</b>
            ({{ DAY_NAMES[s.itemYangDihapus.value.dayOfWeek] }} {{ s.itemYangDihapus.value.startTime }}-{{ s.itemYangDihapus.value.endTime }})
            akan dihapus permanen.
          </p>
          <div class="flex gap-2 mt-5">
            <button class="flex-1 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700" :disabled="s.isDeleting.value" @click="s.batalHapus()">Batal</button>
            <button class="flex-1 px-4 py-2 text-sm font-semibold text-white rounded-lg bg-red-500 hover:bg-red-600 disabled:opacity-50" :disabled="s.isDeleting.value" @click="s.konfirmasiHapus()">
              {{ s.isDeleting.value ? 'Menghapus...' : 'Ya, Hapus' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>