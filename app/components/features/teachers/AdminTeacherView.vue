<!-- app/components/features/teachers/AdminTeacherView.vue -->
<script setup lang="ts">
import type { TeacherRow } from "~/types/teachers";
import type { FetchError } from "ofetch";

// ===== Search & filter state =====
const searchQuery = ref("");
const statusFilter = ref<"all" | "active" | "inactive">("all");

// Debounce pencarian manual (300ms)
const debouncedSearch = ref("");
let searchTimer: ReturnType<typeof setTimeout> | null = null;
watch(searchQuery, (val) => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    debouncedSearch.value = val;
  }, 300);
});
onUnmounted(() => {
  if (searchTimer) clearTimeout(searchTimer);
});

// ===== Fetch data (server-side filter via query) =====
const { data, pending, error, refresh } = await useFetch<{ data: TeacherRow[] }>("/api/teachers", {
  default: () => ({ data: [] }),
  query: computed(() => ({
    q: debouncedSearch.value || undefined,
    status: statusFilter.value === "all" ? undefined : statusFilter.value,
  })),
});

const teachers = computed<TeacherRow[]>(() => data.value?.data ?? []);

// ===== Toast =====
const pesanSukses = ref("");
const pesanError = ref("");
const showImportModal = ref(false)

// Tampilkan pesan "data berhasil ditambah" setelah redirect dari /create
const route = useRoute()
if (route.query.created === '1') pesanSukses.value = 'Data guru berhasil ditambahkan.'
if (route.query.updated === '1') pesanSukses.value = 'Data guru berhasil diupdate.'

function tutupToast() {
  pesanSukses.value = "";
  pesanError.value = "";
}

// ===== Aktif/Nonaktif: toggle 1 klik =====
const togglingId = ref<string | null>(null);

async function toggleStatus(teacher: TeacherRow) {
  if (togglingId.value) return;
  tutupToast();
  togglingId.value = teacher.id;
  try {
    await $fetch(`/api/teachers/${teacher.id}/status`, {
      method: "PATCH",
      body: { isActive: !teacher.isActive },
    });
    await refresh();
    pesanSukses.value = teacher.isActive
      ? `${teacher.name} dinonaktifkan (tidak bisa login).`
      : `${teacher.name} diaktifkan kembali.`;
  } catch (e) {
    pesanError.value =
      (e as FetchError).data?.statusMessage ?? "Gagal mengubah status guru";
  } finally {
    togglingId.value = null;
  }
}

// ===== Delete =====
const isDeleting = ref<string | null>(null);
const { confirm } = useConfirm()

async function handleDelete(teacher: TeacherRow) {
  if (!await confirm({ title: 'Hapus guru?', message: `Yakin ingin menghapus guru "${teacher.name}"?`, confirmLabel: 'Ya, hapus', tone: 'danger' })) return;
  tutupToast();
  isDeleting.value = teacher.id;
  try {
    await $fetch(`/api/teachers/${teacher.id}`, { method: "DELETE" });
    await refresh();
    pesanSukses.value = `Guru "${teacher.name}" berhasil dihapus.`;
  } catch (e) {
    pesanError.value = (e as FetchError).data?.statusMessage ?? "Gagal menghapus guru";
  } finally {
    isDeleting.value = null;
  }
}
</script>

<template>
  <div class="mx-auto max-w-7xl space-y-6 pb-8">
    <section class="relative overflow-hidden rounded-3xl border border-slate-200 bg-white px-6 py-7 text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-white sm:px-8">
      <div class="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-violet-400/20 blur-3xl" />
      <div class="absolute bottom-0 right-1/4 h-24 w-24 rounded-full bg-emerald-400/20 blur-2xl" />
      <div class="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div><div class="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-violet-600 dark:text-violet-300"><Icon name="heroicons:academic-cap" class="h-4 w-4" /> Data master</div><h1 class="text-3xl font-bold tracking-tight sm:text-4xl">Data Guru</h1><p class="mt-2 text-sm text-slate-500 dark:text-slate-300">Kelola profil guru, mata pelajaran, dan status akun.</p></div>
        <div class="flex items-center gap-2">
          <button type="button" class="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/20" @click="showImportModal = true"><Icon name="heroicons:arrow-up-tray" class="h-4 w-4" /> Import CSV</button>
          <NuxtLink to="/dashboard/teachers/create" class="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-600"><Icon name="heroicons:plus-20-solid" class="h-4 w-4" /> Tambah Guru</NuxtLink>
        </div>
      </div>
    </section>

    <div class="grid gap-4 sm:grid-cols-3">
      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"><p class="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total guru</p><p class="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{{ teachers.length }}</p><p class="mt-1 text-xs text-slate-400 dark:text-slate-500">Tenaga pengajar terdaftar</p></div>
      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"><p class="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Guru aktif</p><p class="mt-2 text-3xl font-bold text-emerald-600 dark:text-emerald-400">{{ teachers.filter(t => t.isActive).length }}</p><p class="mt-1 text-xs text-slate-400 dark:text-slate-500">Bisa login & mengajar</p></div>
      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"><p class="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Nonaktif</p><p class="mt-2 text-3xl font-bold text-slate-500 dark:text-slate-400">{{ teachers.filter(t => !t.isActive).length }}</p><p class="mt-1 text-xs text-slate-400 dark:text-slate-500">Perlu ditinjau</p></div>
    </div>

    <!-- Toast -->
    <div v-if="pesanSukses" class="flex items-center justify-between gap-3 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-lg px-4 py-3 text-sm text-emerald-800 dark:text-emerald-300">
      <span>{{ pesanSukses }}</span>
      <button class="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-200 font-bold" @click="tutupToast()"><Icon name="heroicons:x-mark" class="h-4 w-4" /></button>
    </div>
    <div v-if="pesanError" class="flex items-center justify-between gap-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 text-sm text-red-700 dark:text-red-300">
      <span>{{ pesanError }}</span>
      <button class="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-200 font-bold" @click="tutupToast()"><Icon name="heroicons:x-mark" class="h-4 w-4" /></button>
    </div>

    <div class="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 p-4 shadow-sm sm:flex-row sm:items-center">
      <div class="relative flex-1">
        <Icon name="heroicons:magnifying-glass" class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input v-model="searchQuery" type="search" placeholder="Cari nama, NIP, mapel..." class="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none transition focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-700/50 dark:text-white">
        <button v-if="searchQuery" class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500" @click="searchQuery = ''"><Icon name="heroicons:x-mark" class="h-4 w-4" /></button>
      </div>
      <div class="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 text-xs font-medium dark:border-slate-600 dark:bg-slate-700/50">
      <button
        v-for="opt in [{ v: 'all', l: 'Semua' }, { v: 'active', l: 'Aktif' }, { v: 'inactive', l: 'Nonaktif' }] as const"
        :key="opt.v"
        class="px-3 py-1.5 rounded-md transition-colors"
        :class="statusFilter === opt.v ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'"
        @click="statusFilter = opt.v"
      >
        {{ opt.l }}
      </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="pending" class="rounded-2xl border border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 p-12 text-center shadow-sm">
      <div class="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
      <p class="mt-3 text-sm text-slate-500 dark:text-slate-400">Memuat data...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 p-6 text-center">
      <p class="text-red-600 dark:text-red-400 font-medium">Gagal memuat data</p>
      <button class="mt-3 text-sm text-red-600 dark:text-red-400 hover:underline" @click="refresh()">Coba lagi</button>
    </div>

    <!-- Empty -->
    <div v-else-if="teachers.length === 0" class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
      <Icon name="heroicons:academic-cap" class="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
      <p class="text-slate-600 dark:text-slate-300 font-medium">
        {{ searchQuery || statusFilter !== 'all' ? 'Tidak ditemukan' : 'Belum ada guru' }}
      </p>
      <p class="text-sm text-slate-400 dark:text-slate-500 mt-1">
        <template v-if="searchQuery || statusFilter !== 'all'">
          Tidak ada guru yang cocok dengan pencarian
          <button class="text-emerald-600 dark:text-emerald-400 hover:underline font-medium" @click="searchQuery = ''; statusFilter = 'all'">hapus filter</button>
        </template>
        <template v-else>Tambahkan guru pertama</template>
      </p>
      <NuxtLink
        v-if="!searchQuery && statusFilter === 'all'"
        to="/dashboard/teachers/create"
        class="inline-block mt-4 px-4 py-2 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600"
      >
        <Icon name="heroicons:plus-20-solid" class="w-4 h-4 inline" /> Tambah Guru
      </NuxtLink>
    </div>

    <!-- Table -->
    <div v-else class="overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 shadow-sm">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="border-b border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-700/30">
            <tr>
              <th class="text-left font-medium text-slate-600 dark:text-slate-400 px-4 py-3 w-12">No</th>
              <th class="text-left font-medium text-slate-600 dark:text-slate-400 px-4 py-3">Nama</th>
              <th class="text-left font-medium text-slate-600 dark:text-slate-400 px-4 py-3 w-28">Kode</th>
              <th class="text-left font-medium text-slate-600 dark:text-slate-400 px-4 py-3 w-36">NIP</th>
              <th class="text-left font-medium text-slate-600 dark:text-slate-400 px-4 py-3">Mapel</th>
              <th class="text-left font-medium text-slate-600 dark:text-slate-400 px-4 py-3">Telepon</th>
              <th class="text-left font-medium text-slate-600 dark:text-slate-400 px-4 py-3 w-24">Kelas</th>
              <th class="text-left font-medium text-slate-600 dark:text-slate-400 px-4 py-3">Status</th>
              <th class="text-right font-medium text-slate-600 dark:text-slate-400 px-4 py-3 w-32">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(teacher, i) in teachers"
              :key="teacher.id"
              class="border-b border-slate-100 transition hover:bg-violet-50/30 dark:border-slate-700 dark:hover:bg-slate-700/30 last:border-0"
            >
              <td class="px-4 py-3 text-slate-400 dark:text-slate-500">{{ i + 1 }}</td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-2.5">
                  <div class="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300 flex items-center justify-center text-xs font-semibold shrink-0">
                    {{ teacher.name?.charAt(0).toUpperCase() }}
                  </div>
                  <div>
                    <span class="font-medium text-slate-800 dark:text-slate-200">{{ teacher.name }}</span>
                    <p v-if="teacher.email" class="text-xs text-slate-400 dark:text-slate-500">{{ teacher.email }}</p>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3 font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">{{ teacher.code ?? "—" }}</td>
              <td class="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-300">{{ teacher.nip ?? "—" }}</td>
              <td class="px-4 py-3">
                <span v-if="teacher.subject" class="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300">
                  {{ teacher.subject }}
                </span>
                <span v-else class="text-slate-400 dark:text-slate-500">—</span>
              </td>
              <td class="px-4 py-3 text-slate-600 dark:text-slate-300">{{ teacher.phone ?? "—" }}</td>
              <td class="px-4 py-3 text-center">
                <span class="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400">
                  <span class="font-medium text-slate-800 dark:text-slate-200">{{ teacher.classCount ?? 0 }}</span>
                </span>
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <StatusSwitch :active="teacher.isActive" :loading="togglingId === teacher.id" @toggle="toggleStatus(teacher)" />
                  <span class="text-xs font-medium" :class="teacher.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'">
                    {{ teacher.isActive ? 'Aktif' : 'Nonaktif' }}
                  </span>
                </div>
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center justify-end gap-1">
                  <NuxtLink
                    :to="`/dashboard/teachers/${teacher.id}/edit`"
                    class="px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                  >
                    Edit
                  </NuxtLink>
                  <button
                    :disabled="isDeleting === teacher.id"
                    class="px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    @click="handleDelete(teacher)"
                  >
                    {{ isDeleting === teacher.id ? "..." : "Hapus" }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <!-- Info jumlah -->
      <div class="border-t border-slate-100 dark:border-slate-700 px-4 py-3 text-xs text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-slate-800/30">
        Menampilkan {{ teachers.length }} guru
        <template v-if="searchQuery"> — filter: "{{ searchQuery }}"</template>
        <template v-if="statusFilter !== 'all'"> — status: {{ statusFilter === 'active' ? 'Aktif' : 'Nonaktif' }}</template>
      </div>
    </div>

    <TeacherImportModal :open="showImportModal" @close="showImportModal = false" @imported="pesanSukses = 'Data guru berhasil diimpor'; refresh()" />
  </div>
</template>