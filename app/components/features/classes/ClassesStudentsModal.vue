<!-- app/components/features/classes/ClassesStudentsModal.vue -->
<script setup lang="ts">
import type { FetchError } from "ofetch";

interface StudentRow {
  id: string;
  nis: string;
  gender: string;
  classId: string | null;
  name: string;
}

const props = defineProps<{
  classId: string;
  className: string;
}>();

const emit = defineEmits<{
  close: [];
  saved: [];
}>();

// ===== Fetch data =====
const {
  data: currentData,
  pending: loadingCurrent,
  error: currentError,
  refresh: refreshCurrent,
} = await useFetch<{ data: StudentRow[] }>(`/api/classes/${props.classId}/students`);

const {
  data: availableData,
  pending: loadingAvailable,
  refresh: refreshAvailable,
} = await useFetch<{ data: StudentRow[] }>(`/api/classes/${props.classId}/students/available`);

const currentStudents = computed<StudentRow[]>(() => currentData.value?.data ?? []);
const availableStudentsOrig = computed<StudentRow[]>(() => availableData.value?.data ?? []);

// ===== Search =====
const searchQuery = ref("");

const availableStudents = computed(() => {
  const q = searchQuery.value.toLowerCase().trim();
  if (!q) return availableStudentsOrig.value;
  return availableStudentsOrig.value.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.nis.toLowerCase().includes(q)
  );
});

// ===== Selected students to add =====
const selectedIds = ref<string[]>([]);

function toggleSelect(id: string) {
  const idx = selectedIds.value.indexOf(id);
  if (idx >= 0) {
    selectedIds.value.splice(idx, 1);
  } else {
    selectedIds.value.push(id);
  }
}

function toggleSelectAll() {
  if (selectedIds.value.length === filteredAvailableIds.value.length) {
    selectedIds.value = [];
  } else {
    selectedIds.value = filteredAvailableIds.value;
  }
}

const filteredAvailableIds = computed(() => availableStudents.value.map((s) => s.id));

// ===== Add students =====
const isAdding = ref(false);
const addError = ref("");

async function handleAddStudents() {
  if (!selectedIds.value.length) return;
  addError.value = "";
  isAdding.value = true;

  try {
    await $fetch(`/api/classes/${props.classId}/students`, {
      method: "POST",
      body: { studentIds: selectedIds.value },
    });
    selectedIds.value = [];
    await Promise.all([refreshCurrent(), refreshAvailable()]);
  } catch (e) {
    addError.value = (e as FetchError).data?.statusMessage ?? "Gagal menambahkan siswa";
  } finally {
    isAdding.value = false;
  }
}

// ===== Remove student =====
const removingIds = ref<Set<string>>(new Set());
const removeError = ref("");
const { confirm } = useConfirm()

async function handleRemove(studentId: string) {
  if (!await confirm({ title: 'Hapus siswa dari kelas?', message: 'Siswa akan dikeluarkan dari kelas ini.', confirmLabel: 'Ya, hapus', tone: 'danger' })) return;
  removeError.value = "";
  removingIds.value.add(studentId);

  try {
    await $fetch(`/api/classes/${props.classId}/students/${studentId}`, {
      method: "DELETE",
    });
    await Promise.all([refreshCurrent(), refreshAvailable()]);
  } catch (e) {
    removeError.value = (e as FetchError).data?.statusMessage ?? "Gagal menghapus siswa";
  } finally {
    removingIds.value.delete(studentId);
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      @click.self="$emit('close')"
    >
      <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col">
        <!-- ===== HEADER ===== -->
        <div class="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700 shrink-0">
          <div>
            <h2 class="text-lg font-bold text-slate-800 dark:text-slate-100">
              Kelola Siswa — {{ className }}
            </h2>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Tambah atau hapus siswa dari kelas ini
            </p>
          </div>
          <button
            class="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors shrink-0"
            @click="$emit('close')"
          >
            <Icon name="heroicons:x-mark" class="w-5 h-5" />
          </button>
        </div>

        <!-- ===== BODY (scrollable) ===== -->
        <div class="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          <!-- ===== SECTION 1: Current students ===== -->
          <div>
            <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
              <Icon name="heroicons:users" class="w-4 h-4 shrink-0" />
              <span>Siswa Saat Ini</span>
              <span
                v-if="currentStudents.length"
                class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold"
              >
                {{ currentStudents.length }}
              </span>
            </h3>

            <!-- Loading -->
            <div
              v-if="loadingCurrent"
              class="flex items-center gap-2 py-3 text-sm text-slate-400 dark:text-slate-500"
            >
              <div class="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              Memuat data...
            </div>

            <!-- Error -->
            <div
              v-else-if="currentError"
              class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-300"
            >
              Gagal memuat siswa
              <button
                class="ml-2 text-xs font-medium underline hover:no-underline"
                @click="refreshCurrent()"
              >
                Coba lagi
              </button>
            </div>

            <!-- Empty -->
            <div
              v-else-if="currentStudents.length === 0"
              class="bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-700 p-4 text-center"
            >
              <p class="text-sm text-slate-500 dark:text-slate-400">Belum ada siswa di kelas ini</p>
            </div>

            <!-- List -->
            <ul v-else class="space-y-1.5">
              <li
                v-for="student in currentStudents"
                :key="student.id"
                class="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <div class="flex items-center gap-2.5 min-w-0">
                  <div
                    class="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-semibold shrink-0"
                  >
                    {{ student.name?.charAt(0).toUpperCase() }}
                  </div>
                  <div class="min-w-0">
                    <p class="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                      {{ student.name }}
                    </p>
                    <p class="text-xs text-slate-400 dark:text-slate-500 font-mono">{{ student.nis }}</p>
                  </div>
                </div>
                <button
                  :disabled="removingIds.has(student.id)"
                  class="shrink-0 px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  @click="handleRemove(student.id)"
                >
                  <template v-if="removingIds.has(student.id)">...</template>
                  <template v-else>
                    <Icon name="heroicons:trash" class="w-3.5 h-3.5" /> Hapus
                  </template>
                </button>
              </li>
            </ul>
          </div>

          <!-- ===== SECTION 2: Add students ===== -->
          <div>
            <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
              <Icon name="heroicons:plus-circle" class="w-4 h-4 shrink-0" />
              <span>Tambah Siswa</span>
            </h3>

            <!-- Search -->
            <div class="relative mb-3">
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Cari siswa berdasarkan nama atau NIS..."
                class="w-full h-10 pl-9 pr-3.5 text-sm rounded-lg border bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
              <Icon name="heroicons:magnifying-glass" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-4 h-4" />
            </div>

            <!-- Error add -->
            <div
              v-if="addError || removeError"
              class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-xs text-red-700 dark:text-red-300 mb-3"
            >
              {{ addError || removeError }}
            </div>

            <!-- Loading available -->
            <div
              v-if="loadingAvailable"
              class="flex items-center gap-2 py-3 text-sm text-slate-400 dark:text-slate-500"
            >
              <div class="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              Memuat daftar siswa...
            </div>

            <!-- No available students -->
            <div
              v-else-if="availableStudents.length === 0 && availableStudentsOrig.length === 0"
              class="bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-700 p-4 text-center"
            >
              <p class="text-sm text-slate-500 dark:text-slate-400">Semua siswa sudah terdaftar di kelas</p>
            </div>

            <!-- Empty search result -->
            <div
              v-else-if="availableStudents.length === 0 && searchQuery"
              class="bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-700 p-4 text-center"
            >
              <p class="text-sm text-slate-500 dark:text-slate-400">
                Tidak ditemukan siswa dengan kata kunci "{{ searchQuery }}"
              </p>
            </div>

            <!-- Available list -->
            <div v-else class="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
              <!-- Select all header -->
              <div
                v-if="availableStudents.length"
                class="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700"
              >
                <label class="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    :checked="selectedIds.length === filteredAvailableIds.length && filteredAvailableIds.length > 0"
                    :indeterminate="selectedIds.length > 0 && selectedIds.length < filteredAvailableIds.length"
                    class="rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                    @change="toggleSelectAll"
                  >
                  Pilih semua ({{ filteredAvailableIds.length }})
                </label>
                <span v-if="selectedIds.length" class="ml-auto text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  {{ selectedIds.length }} terpilih
                </span>
              </div>

              <!-- List -->
              <div class="max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                <label
                  v-for="student in availableStudents"
                  :key="student.id"
                  class="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    :checked="selectedIds.includes(student.id)"
                    class="rounded border-slate-300 text-emerald-500 focus:ring-emerald-500 shrink-0"
                    @change="toggleSelect(student.id)"
                  >
                  <div class="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center text-xs font-semibold shrink-0">
                    {{ student.name?.charAt(0).toUpperCase() }}
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                      {{ student.name }}
                    </p>
                    <p class="text-xs text-slate-400 dark:text-slate-500 font-mono">{{ student.nis }}</p>
                  </div>
                  <span
                    class="inline-flex items-center gap-1 shrink-0"
                  >
                    <Icon
                      :name="'heroicons:user'"
                      class="w-3.5 h-3.5"
                      :class="student.gender === 'L' ? 'text-blue-400' : 'text-pink-400'"
                    />
                    <span class="text-xs text-slate-400 dark:text-slate-500">{{ student.gender }}</span>
                  </span>
                </label>
              </div>
            </div>

            <!-- Add button -->
            <button
              v-if="selectedIds.length"
              :disabled="isAdding"
              class="mt-3 w-full h-10 text-sm font-semibold text-white rounded-lg bg-emerald-500 hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              @click="handleAddStudents"
            >
              <span v-if="isAdding" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {{ isAdding ? 'Menambahkan...' : `Tambah ${selectedIds.length} Siswa ke Kelas` }}
            </button>
          </div>
        </div>

        <!-- ===== FOOTER ===== -->
        <div class="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/80 shrink-0">
          <button
            class="h-10 px-4 text-sm font-medium text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            @click="$emit('close')"
          >
            Tutup
          </button>
          <button
            class="h-10 px-4 text-sm font-semibold text-white rounded-lg bg-emerald-500 hover:bg-emerald-600 transition-colors"
            @click="$emit('saved')"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>