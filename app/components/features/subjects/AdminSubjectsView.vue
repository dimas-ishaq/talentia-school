<!-- ============================================================
  AdminSubjectsView — halaman DAFTAR mapel.
  Mirror dari AdminClassesView.vue:
  - Logika list/hapus → composables/useSubjects.ts
  - Form tambah/edit  → SubjectFormModal.vue
  File ini hanya mengatur modal + toast + tabel.
  ============================================================ -->
<script setup lang="ts">
import type { SubjectRow } from '~/types/subjects'

const s = useSubjects()

// ----- Modal tambah/edit -----
const showModal = ref(false)
const editingSubject = ref<SubjectRow | null>(null)

// ----- Modal import CSV -----
const showImportModal = ref(false)

async function onImported() {
  await s.refresh()
  s.pesanSukses.value = 'Import mapel selesai. Periksa hasil di bawah.'
}

function openCreate() {
  editingSubject.value = null
  showModal.value = true
}

function openEdit(mapel: SubjectRow) {
  editingSubject.value = mapel
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingSubject.value = null
}

async function onSaved() {
  const wasEditing = editingSubject.value !== null
  await s.refresh()
  closeModal()
  s.pesanSukses.value = wasEditing ? 'Mata pelajaran berhasil diupdate.' : 'Mata pelajaran berhasil ditambahkan.'
}
</script>

<template>
  <div class="mx-auto max-w-7xl space-y-6 pb-8">
    <section class="relative overflow-hidden rounded-3xl border border-slate-200 bg-white px-6 py-7 text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-white sm:px-8">
      <div class="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-violet-400/20 blur-3xl" />
      <div class="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div><div class="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-violet-600 dark:text-violet-300"><Icon name="heroicons:book-open" class="h-4 w-4" /> Data master</div><h1 class="text-3xl font-bold tracking-tight sm:text-4xl">Mata Pelajaran</h1><p class="mt-2 text-sm text-slate-500 dark:text-slate-300">Kelola kurikulum dan status mata pelajaran sekolah.</p></div>
        <div class="flex items-center gap-2">
      <button
        class="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
        @click="showImportModal = true"
      >
        <Icon name="heroicons:arrow-down-tray" class="w-4 h-4" /> Import CSV
      </button>
      <button
        class="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-600"
        @click="openCreate"
      >
        <Icon name="heroicons:plus-20-solid" class="w-4 h-4" /> Tambah Mapel
      </button>
        </div>
      </div>
    </section>

    <!-- Toast sukses / error -->
    <div v-if="s.pesanSukses.value" class="flex items-center justify-between gap-3 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-lg px-4 py-3 text-sm text-emerald-800 dark:text-emerald-300">
      <span>{{ s.pesanSukses.value }}</span>
      <button class="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-200 font-bold" @click="s.tutupToast()"><Icon name="heroicons:x-mark" class="h-4 w-4" /></button>
    </div>
    <div v-if="s.pesanError.value" class="flex items-center justify-between gap-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 text-sm text-red-700 dark:text-red-300">
      <span>{{ s.pesanError.value }}</span>
      <button class="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-200 font-bold" @click="s.tutupToast()"><Icon name="heroicons:x-mark" class="h-4 w-4" /></button>
    </div>

    <div class="grid gap-4 sm:grid-cols-3">
      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"><p class="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total mapel</p><p class="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{{ s.subjects.value.length }}</p><p class="mt-1 text-xs text-slate-400 dark:text-slate-500">Kurikulum terdaftar</p></div>
      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"><p class="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Mapel aktif</p><p class="mt-2 text-3xl font-bold text-emerald-600">{{ s.subjects.value.filter(m => m.isActive).length }}</p><p class="mt-1 text-xs text-slate-400 dark:text-slate-500">Siap digunakan</p></div>
      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"><p class="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Nonaktif</p><p class="mt-2 text-3xl font-bold text-slate-500 dark:text-slate-400">{{ s.subjects.value.filter(m => !m.isActive).length }}</p><p class="mt-1 text-xs text-slate-400 dark:text-slate-500">Perlu ditinjau</p></div>
    </div>

    <!-- Filter status: Semua / Aktif / Nonaktif -->
    <div class="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 text-xs font-medium shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <button
        v-for="opt in [{ v: 'all', l: 'Semua' }, { v: 'active', l: 'Aktif' }, { v: 'inactive', l: 'Nonaktif' }] as const"
        :key="opt.v"
        class="px-3 py-1.5 rounded-md transition-colors"
        :class="s.statusFilter.value === opt.v ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'"
        @click="s.statusFilter.value = opt.v"
      >
        {{ opt.l }}
      </button>
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
    <div v-else-if="s.filteredSubjects.value.length === 0" class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
      <Icon name="heroicons:book-open" class="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
      <p class="text-slate-600 dark:text-slate-300 font-medium">{{ s.statusFilter.value === 'all' ? 'Belum ada mata pelajaran' : 'Tidak ada mapel pada filter ini' }}</p>
      <p class="text-sm text-slate-400 dark:text-slate-500 mt-1">{{ s.statusFilter.value === 'all' ? 'Tambahkan mapel pertama, contoh: Matematika (MTK)' : 'Coba ganti filter status di atas' }}</p>
      <button v-if="s.statusFilter.value === 'all'" class="mt-4 px-4 py-2 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600" @click="openCreate">
        + Tambah Mapel
      </button>
    </div>

    <!-- Table -->
    <div v-else class="overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 shadow-sm">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="border-b border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-700/30">
            <tr>
              <th class="text-left font-medium text-slate-600 dark:text-slate-400 px-4 py-3 w-12">No</th>
              <th class="text-left font-medium text-slate-600 dark:text-slate-400 px-4 py-3">Kode</th>
              <th class="text-left font-medium text-slate-600 dark:text-slate-400 px-4 py-3">Nama</th>
              <th class="text-left font-medium text-slate-600 dark:text-slate-400 px-4 py-3">Deskripsi</th>
              <th class="text-left font-medium text-slate-600 dark:text-slate-400 px-4 py-3">Status</th>
              <th class="text-right font-medium text-slate-600 dark:text-slate-400 px-4 py-3 w-32">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(mapel, i) in s.filteredSubjects.value"
              :key="mapel.id"
              class="border-b border-slate-100 dark:border-slate-700 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <td class="px-4 py-3 text-slate-400 dark:text-slate-500">{{ i + 1 }}</td>
              <td class="px-4 py-3">
                <span class="inline-block px-2 py-0.5 rounded-md text-xs font-mono font-semibold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                  {{ mapel.code }}
                </span>
              </td>
              <td class="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{{ mapel.name }}</td>
              <td class="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">{{ mapel.description || '-' }}</td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <StatusSwitch :active="mapel.isActive" :loading="s.togglingId.value === mapel.id" @toggle="s.toggleStatus(mapel)" />
                  <span class="text-xs font-medium" :class="mapel.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'">
                    {{ mapel.isActive ? 'Aktif' : 'Nonaktif' }}
                  </span>
                </div>
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center justify-end gap-1">
                  <button class="px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors" @click="openEdit(mapel)">
                    Edit
                  </button>
                  <button class="px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors" @click="s.mintaHapus(mapel)">
                    Hapus
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal tambah/edit -->
    <SubjectFormModal
      v-if="showModal"
      :editing-subject="editingSubject"
      @close="closeModal"
      @saved="onSaved"
    />

    <!-- Modal import CSV -->
    <SubjectImportModal
      :open="showImportModal"
      @close="showImportModal = false"
      @imported="onImported"
    />

    <!-- Modal konfirmasi hapus -->
    <Teleport to="body">
      <div v-if="s.mapelYangDihapus.value" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" @click.self="s.batalHapus()">
        <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
          <div class="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-3 text-xl">!</div>
          <h2 class="font-bold text-slate-800 dark:text-slate-100">Hapus mapel ini?</h2>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
            <b>{{ s.mapelYangDihapus.value.name }}</b> ({{ s.mapelYangDihapus.value.code }})
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
