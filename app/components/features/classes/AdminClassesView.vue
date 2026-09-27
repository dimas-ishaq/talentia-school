<!-- app/components/features/classes/AdminClassesView.vue -->
<script setup lang="ts">
import ClassesFormModal from "./ClassesFormModal.vue";
import ClassesList from "./ClassesList.vue";
import ClassesStudentsModal from "./ClassesStudentsModal.vue";
import type { ClassRow, TeacherOption } from "~/types/classes";
import type { FetchError } from "ofetch";

// ===== Fetch data =====
const {
  data: classesData,
  pending,
  error,
  refresh,
} = await useFetch("/api/classes");
const { data: teachersData } = await useFetch<{ data: TeacherOption[] }>('/api/teachers');

const classes = computed<ClassRow[]>(() => classesData.value?.data ?? []);
const teachers = computed<TeacherOption[]>(() => teachersData.value?.data ?? []);

// ===== Toast sederhana (untuk feedback toggle status) =====
const pesanSukses = ref("");
const pesanError = ref("");

function tutupToast() {
  pesanSukses.value = "";
  pesanError.value = "";
}

// ===== Filter status (client-side, data kelas sedikit) =====
const statusFilter = ref<"all" | "active" | "inactive">("all");
const filteredClasses = computed(() => {
  if (statusFilter.value === "active") return classes.value.filter((c) => c.isActive);
  if (statusFilter.value === "inactive") return classes.value.filter((c) => !c.isActive);
  return classes.value;
});

// ===== Statistik ringkas =====
const activeCount = computed(() => classes.value.filter((c) => c.isActive).length);
const inactiveCount = computed(() => classes.value.length - activeCount.value);
const totalStudentCount = computed(() => classes.value.reduce((acc, c) => acc + (c.studentCount ?? 0), 0));

// ===== Aktif/Nonaktif: toggle 1 klik, tanpa modal (reversibel) =====
const togglingId = ref<string | null>(null);

async function toggleStatus(cls: ClassRow) {
  if (togglingId.value) return; // cegah klik ganda
  tutupToast();
  togglingId.value = cls.id;
  try {
    await $fetch(`/api/classes/${cls.id}/status`, {
      method: "PATCH",
      body: { isActive: !cls.isActive },
    });
    await refresh();
    pesanSukses.value = cls.isActive
      ? `Kelas "${cls.name}" dinonaktifkan.`
      : `Kelas "${cls.name}" diaktifkan kembali.`;
  } catch (e) {
    pesanError.value =
      (e as FetchError).data?.statusMessage ?? "Gagal mengubah status kelas";
  } finally {
    togglingId.value = null;
  }
}

// ===== Modal state =====
const showModal = ref(false);
const editingClass = ref<ClassRow | null>(null);

function openCreate() {
  editingClass.value = null;
  showModal.value = true;
}

function openEdit(cls: ClassRow) {
  editingClass.value = cls;
  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
  editingClass.value = null;
}

async function onSaved() {
  await refresh();
  closeModal();
}

// ===== Students modal =====
const showStudentsModal = ref(false);
const studentsTarget = ref<ClassRow | null>(null);

function openManageStudents(cls: ClassRow) {
  studentsTarget.value = cls;
  showStudentsModal.value = true;
}

function closeStudentsModal() {
  showStudentsModal.value = false;
  studentsTarget.value = null;
}

async function onStudentsSaved() {
  await refresh();
  closeStudentsModal();
}

// ===== Delete =====
const isDeleting = ref<string | null>(null);
const { confirm } = useConfirm()

async function handleDelete(cls: ClassRow) {
  if (!await confirm({ title: 'Hapus kelas?', message: `Yakin ingin menghapus kelas "${cls.name}"?`, confirmLabel: 'Ya, hapus', tone: 'danger' })) return;
  tutupToast();
  isDeleting.value = cls.id;
  try {
    await $fetch(`/api/classes/${cls.id}`, { method: "DELETE" });
    await refresh();
    pesanSukses.value = `Kelas "${cls.name}" berhasil dihapus.`;
  } catch (e) {
    pesanError.value = (e as FetchError).data?.statusMessage ?? "Gagal menghapus kelas";
  } finally {
    isDeleting.value = null;
  }
}
</script>

<template>
  <div class="mx-auto max-w-7xl space-y-6 pb-8">
    <section class="relative overflow-hidden rounded-3xl border border-slate-200 bg-white px-6 py-7 text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-white sm:px-8">
      <div class="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl" />
      <div class="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div><div class="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-300"><Icon name="heroicons:academic-cap" class="h-4 w-4" /> Data master</div><h1 class="text-3xl font-bold tracking-tight sm:text-4xl">Data Kelas</h1><p class="mt-2 text-sm text-slate-500 dark:text-slate-300">Kelola struktur kelas, wali kelas, dan siswa secara terpusat.</p></div>
        <button class="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-600" @click="openCreate"><Icon name="heroicons:plus-20-solid" class="h-4 w-4" /> Tambah Kelas</button>
      </div>
    </section>

    <!-- Toast sukses / error -->
    <div v-if="pesanSukses" class="flex items-center justify-between gap-3 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-lg px-4 py-3 text-sm text-emerald-800 dark:text-emerald-300">
      <span>{{ pesanSukses }}</span>
      <button class="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-200 font-bold" @click="tutupToast()"><Icon name="heroicons:x-mark" class="h-4 w-4" /></button>
    </div>
    <div v-if="pesanError" class="flex items-center justify-between gap-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 text-sm text-red-700 dark:text-red-300">
      <span>{{ pesanError }}</span>
      <button class="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-200 font-bold" @click="tutupToast()"><Icon name="heroicons:x-mark" class="h-4 w-4" /></button>
    </div>

    <div class="grid gap-4 sm:grid-cols-3">
      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"><p class="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total kelas</p><p class="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{{ classes.length }}</p><p class="mt-1 text-xs text-slate-400 dark:text-slate-500">Struktur terdaftar</p></div>
      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"><p class="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Kelas aktif</p><p class="mt-2 text-3xl font-bold text-emerald-600 dark:text-emerald-400">{{ activeCount }}</p><p class="mt-1 text-xs text-slate-400 dark:text-slate-500">Siap digunakan</p></div>
      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"><p class="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total siswa</p><p class="mt-2 text-3xl font-bold text-blue-600 dark:text-blue-400">{{ totalStudentCount }}</p><p class="mt-1 text-xs text-slate-400 dark:text-slate-500">Terdistribusi di kelas</p></div>
    </div>

    <!-- Filter status: Semua / Aktif / Nonaktif -->
    <div class="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 text-xs font-medium shadow-sm dark:border-slate-700 dark:bg-slate-800">
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

    <!-- List: loading / error / empty / table -->
    <ClassesList
      :classes="filteredClasses"
      :pending="pending"
      :error="error ?? null"
      :is-deleting="isDeleting"
      :toggling-id="togglingId"
      @create="openCreate"
      @edit="openEdit"
      @delete="handleDelete"
      @retry="refresh"
      @manage-students="openManageStudents"
      @toggle-status="toggleStatus"
    />

    <!-- Modal: create / edit -->
    <ClassesFormModal
      v-if="showModal"
      :editing-class="editingClass"
      :teachers="teachers"
      @close="closeModal"
      @saved="onSaved"
    />

    <!-- Modal: manage students -->
    <ClassesStudentsModal
      v-if="showStudentsModal && studentsTarget"
      :class-id="studentsTarget.id"
      :class-name="studentsTarget.name"
      @close="closeStudentsModal"
      @saved="onStudentsSaved"
    />
  </div>
</template>