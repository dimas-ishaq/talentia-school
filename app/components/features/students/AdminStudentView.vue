<!-- ============================================================
  AdminStudentView — halaman DAFTAR siswa (Read + Delete + Import).
  Dibuat TIPIS agar mudah dirawat pemula:
  - Logika list/hapus  → composables/useStudents.ts
  - Logika import      → composables/useStudentImport.ts
  - Modal import       → StudentImportModal.vue (file terpisah)
  - Form tambah/ubah   → halaman create.vue / [id]/edit.vue

  Alur file siswa:
    index.vue (list, file ini) → create.vue (tambah)
                               → [id]/edit.vue (ubah)
                               → import via modal di bawah
  ============================================================ -->
<script setup lang="ts">
const s = useStudents()
const showImportModal = ref(false)

// Fetch kelas untuk dropdown filter
const { data: semuaKelas } = await useFetch<{ data: { id: string; name: string }[] }>('/api/classes', { key: 'filter-classes' })
</script>

<template>
  <div class="mx-auto max-w-7xl space-y-6 pb-8">
    <section class="relative overflow-hidden rounded-3xl border border-slate-200 bg-white px-6 py-7 text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-white sm:px-8">
      <div class="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-blue-400/20 blur-3xl" />
      <div class="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div><div class="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-300"><Icon name="heroicons:users" class="h-4 w-4" /> Data master</div><h1 class="text-3xl font-bold tracking-tight sm:text-4xl">Data Siswa</h1><p class="mt-2 text-sm text-slate-500 dark:text-slate-300">Kelola biodata siswa, kelas, dan status akun.</p></div>
        <div class="flex items-center gap-2">
          <button class="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/20" @click="showImportModal = true"><Icon name="heroicons:arrow-down-tray" class="h-4 w-4" /> Import CSV</button>
          <NuxtLink to="/dashboard/students/create" class="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-600"><span>+</span> Tambah Siswa</NuxtLink>
        </div>
      </div>
    </section>

    <div class="grid gap-4 sm:grid-cols-3">
      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"><p class="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total siswa</p><p class="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{{ s.meta.value?.total ?? s.students.value.length }}</p><p class="mt-1 text-xs text-slate-400 dark:text-slate-500">Seluruh data siswa</p></div>
      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"><p class="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Laki-laki</p><p class="mt-2 text-3xl font-bold text-blue-600">{{ s.students.value.filter(x => x.gender === 'L').length }}</p><p class="mt-1 text-xs text-slate-400 dark:text-slate-500">Pada halaman ini</p></div>
      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"><p class="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Perempuan</p><p class="mt-2 text-3xl font-bold text-pink-500">{{ s.students.value.filter(x => x.gender === 'P').length }}</p><p class="mt-1 text-xs text-slate-400 dark:text-slate-500">Pada halaman ini</p></div>
    </div>

    <!-- Toast sukses / error (pengganti alert() bawaan browser) -->
    <div v-if="s.pesanSukses.value" class="flex items-center justify-between gap-3 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-lg px-4 py-3 text-sm text-emerald-800 dark:text-emerald-300">
      <span>{{ s.pesanSukses.value }}</span>
      <button class="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-200 font-bold" @click="s.tutupToast()"><Icon name="heroicons:x-mark" class="h-4 w-4" /></button>
    </div>
    <div v-if="s.pesanError.value" class="flex items-center justify-between gap-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 text-sm text-red-700 dark:text-red-300">
      <span>{{ s.pesanError.value }}</span>
      <button class="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-200 font-bold" @click="s.tutupToast()"><Icon name="heroicons:x-mark" class="h-4 w-4" /></button>
    </div>

    <!-- Filter advance: search + kelas + gender + status -->
    <div class="rounded-2xl border border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 p-4 shadow-sm space-y-3">
      <div class="flex flex-col sm:flex-row sm:items-center gap-3">
        <div class="relative flex-1 min-w-0">
          <Icon name="heroicons:magnifying-glass" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            v-model="s.search.value"
            type="search"
            placeholder="Cari nama atau NIS..."
            class="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          >
        </div>
        <div v-if="s.search.value" class="shrink-0">
          <button class="px-3 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400" @click="s.search.value = ''"><Icon name="heroicons:x-mark" class="inline h-3.5 w-3.5" /> Bersihkan</button>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <select v-model="s.classIdFilter.value" class="h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm">
          <option value="">Semua Kelas</option>
          <option v-for="k in semuaKelas?.data ?? []" :key="k.id" :value="k.id">{{ k.name }}</option>
        </select>
        <select v-model="s.genderFilter.value" class="h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm">
          <option value="">Semua Gender</option>
          <option value="L">Laki-laki</option>
          <option value="P">Perempuan</option>
        </select>
        <div class="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium">
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
        <div v-if="s.search.value || s.classIdFilter.value || s.genderFilter.value || s.statusFilter.value !== 'all'" class="ml-auto">
          <button class="px-3 py-2 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300" @click="s.search.value = ''; s.classIdFilter.value = ''; s.genderFilter.value = ''; s.statusFilter.value = 'all'">
            Reset Filter
          </button>
        </div>
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
    <div v-else-if="s.students.value.length === 0" class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
      <Icon name="heroicons:inbox" class="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
      <p class="text-slate-600 dark:text-slate-300 font-medium">{{ s.statusFilter.value === 'all' ? 'Belum ada siswa' : 'Tidak ada siswa pada filter ini' }}</p>
      <p class="text-sm text-slate-400 dark:text-slate-500 mt-1">{{ s.statusFilter.value === 'all' ? 'Tambahkan siswa pertama' : 'Coba ganti filter status di atas' }}</p>
      <NuxtLink v-if="s.statusFilter.value === 'all'" to="/dashboard/students/create" class="inline-block mt-4 px-4 py-2 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600">
        + Tambah Siswa
      </NuxtLink>
    </div>

    <!-- Table -->
    <div v-else class="overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 shadow-sm">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="border-b border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-700/30">
            <tr>
              <th class="text-left font-medium text-slate-600 dark:text-slate-400 px-4 py-3 w-12">No</th>
              <th class="text-left font-medium text-slate-600 dark:text-slate-400 px-4 py-3">NIS</th>
              <th class="text-left font-medium text-slate-600 dark:text-slate-400 px-4 py-3">Nama</th>
              <th class="text-left font-medium text-slate-600 dark:text-slate-400 px-4 py-3">Kelas</th>
              <th class="text-left font-medium text-slate-600 dark:text-slate-400 px-4 py-3">Gender</th>
              <th class="text-left font-medium text-slate-600 dark:text-slate-400 px-4 py-3">Status</th>
              <th class="text-right font-medium text-slate-600 dark:text-slate-400 px-4 py-3 w-32">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(student, i) in s.students.value"
              :key="student.id"
              class="border-b border-slate-100 transition hover:bg-blue-50/30 dark:border-slate-700 dark:hover:bg-slate-700/30 last:border-0"
            >
              <td class="px-4 py-3 text-slate-400 dark:text-slate-500">{{ s.nomorUrut(i) }}</td>
              <td class="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-300">{{ student.nis }}</td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-semibold shrink-0">
                    {{ student.name?.charAt(0).toUpperCase() }}
                  </div>
                  <span class="font-medium text-slate-800 dark:text-slate-200">{{ student.name }}</span>
                </div>
              </td>
              <td class="px-4 py-3">
                <span class="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300">
                  {{ student.className ?? '-' }}
                </span>
              </td>
              <td class="px-4 py-3 text-slate-600 dark:text-slate-300">
                {{ student.gender === 'L' ? 'Laki-laki' : 'Perempuan' }}
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <StatusSwitch :active="student.isActive" :loading="s.togglingId.value === student.id" @toggle="s.toggleStatus(student)" />
                  <span class="text-xs font-medium" :class="student.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'">
                    {{ student.isActive ? 'Aktif' : 'Nonaktif' }}
                  </span>
                </div>
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center justify-end gap-1">
                  <NuxtLink :to="`/dashboard/students/${student.id}/edit`" class="px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors">
                    Edit
                  </NuxtLink>
                  <button
                    class="px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors"
                    @click="s.mintaHapus(student)"
                  >
                    Hapus
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="s.meta.value && s.meta.value.totalPages > 1" class="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
        <div class="text-xs text-slate-500 dark:text-slate-400">
          Menampilkan
          <span class="font-medium text-slate-700 dark:text-slate-300">
            {{ (s.meta.value.page - 1) * s.meta.value.perPage + 1 }}–{{ Math.min(s.meta.value.page * s.meta.value.perPage, s.meta.value.total) }}
          </span>
          dari <span class="font-medium text-slate-700 dark:text-slate-300">{{ s.meta.value.total }}</span> siswa
        </div>
        <div class="flex items-center gap-1">
          <button
            :disabled="s.meta.value.page <= 1"
            class="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-slate-600 dark:text-slate-300"
            @click="s.page.value = s.meta.value!.page - 1"
          >
            <Icon name="heroicons:arrow-left" class="inline h-3.5 w-3.5" /> Sebelumnya
          </button>
          <span class="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300">{{ s.meta.value.page }} / {{ s.meta.value.totalPages }}</span>
          <button
            :disabled="s.meta.value.page >= s.meta.value.totalPages"
            class="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-slate-600 dark:text-slate-300"
            @click="s.page.value = s.meta.value!.page + 1"
          >
            Berikutnya <Icon name="heroicons:arrow-right" class="inline h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>

    <!-- Modal konfirmasi hapus -->
    <Teleport to="body">
      <div v-if="s.siswaYangDihapus.value" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" @click.self="s.batalHapus()">
        <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
          <div class="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-3 text-xl">!</div>
          <h2 class="font-bold text-slate-800 dark:text-slate-100">Hapus siswa ini?</h2>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
            <b>{{ s.siswaYangDihapus.value.name }}</b> ({{ s.siswaYangDihapus.value.nis }})
            akan dihapus permanen beserta akun loginnya.
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

    <!-- Modal import CSV -->
    <StudentImportModal :open="showImportModal" @close="showImportModal = false" @imported="s.refresh()" />
  </div>
</template>
