<!-- app/components/features/classes/ClassesList.vue -->
<script setup lang="ts">
import type { ClassRow } from "~/types/classes";

defineProps<{
  classes: ClassRow[];
  pending: boolean;
  error: Error | null;
  isDeleting: string | null;
  togglingId: string | null;
}>();

defineEmits<{
  create: [];
  edit: [cls: ClassRow];
  delete: [cls: ClassRow];
  retry: [];
  manageStudents: [cls: ClassRow];
  toggleStatus: [cls: ClassRow];
}>();
</script>

<template>
  <!-- Loading -->
  <div v-if="pending" class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
    <div class="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
    <p class="mt-3 text-sm text-slate-500 dark:text-slate-400">Memuat data...</p>
  </div>

  <!-- Error -->
  <div v-else-if="error" class="bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 p-6 text-center">
    <p class="text-red-600 dark:text-red-400 font-medium">Gagal memuat data</p>
    <button class="mt-3 text-sm text-red-600 dark:text-red-400 hover:underline" @click="$emit('retry')">Coba lagi</button>
  </div>

  <!-- Empty -->
  <div v-else-if="classes.length === 0" class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
    <Icon name="heroicons:academic-cap" class="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
    <p class="text-slate-600 dark:text-slate-300 font-medium">Belum ada kelas</p>
    <p class="text-sm text-slate-400 dark:text-slate-500 mt-1">Tambahkan kelas pertama</p>
    <button class="inline-block mt-4 px-4 py-2 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600" @click="$emit('create')">
      <Icon name="heroicons:plus-20-solid" class="w-4 h-4" /> Tambah Kelas
    </button>
  </div>

  <!-- Table -->
  <div v-else class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="border-b border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-700/30">
          <tr>
            <th class="text-left font-medium text-slate-600 dark:text-slate-400 px-4 py-3 w-12">No</th>
            <th class="text-left font-medium text-slate-600 dark:text-slate-400 px-4 py-3">Nama Kelas</th>
            <th class="text-left font-medium text-slate-600 dark:text-slate-400 px-4 py-3 w-24">Level</th>
            <th class="text-left font-medium text-slate-600 dark:text-slate-400 px-4 py-3">Wali Kelas</th>
            <th class="text-left font-medium text-slate-600 dark:text-slate-400 px-4 py-3 w-28">Jml Siswa</th>
            <th class="text-left font-medium text-slate-600 dark:text-slate-400 px-4 py-3">Status</th>
            <th class="text-right font-medium text-slate-600 dark:text-slate-400 px-4 py-3 w-32">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(cls, i) in classes"
            :key="cls.id"
            class="border-b border-slate-100 transition hover:bg-emerald-50/30 dark:border-slate-700 dark:hover:bg-slate-700/30 last:border-0"
          >
            <td class="px-4 py-3 text-slate-400 dark:text-slate-500">{{ i + 1 }}</td>
            <td class="px-4 py-3">
              <span class="font-medium text-slate-800 dark:text-slate-200">{{ cls.name }}</span>
            </td>
            <td class="px-4 py-3">
              <span class="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                Level {{ cls.level }}
              </span>
            </td>
            <td class="px-4 py-3 text-slate-600 dark:text-slate-300">
              {{ cls.teacherName ?? "—" }}
            </td>
            <td class="px-4 py-3">
              <button
                class="inline-flex items-center gap-1.5 px-2.5 py-1 text-sm font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                @click="$emit('manageStudents', cls)"
              >
                <span class="font-medium">{{ cls.studentCount }}</span>
                <span class="text-xs mr-0.5">siswa</span>
                <Icon name="heroicons:cog-6-tooth" class="w-3.5 h-3.5" />
              </button>
            </td>
            <td class="px-4 py-3">
              <div class="flex items-center gap-2">
                <StatusSwitch :active="cls.isActive" :loading="togglingId === cls.id" @toggle="$emit('toggleStatus', cls)" />
                <span class="text-xs font-medium" :class="cls.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'">
                  {{ cls.isActive ? 'Aktif' : 'Nonaktif' }}
                </span>
              </div>
            </td>
            <td class="px-4 py-3">
              <div class="flex items-center justify-end gap-1">
                <button class="px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors" @click="$emit('edit', cls)">Edit</button>
                <button
                  :disabled="isDeleting === cls.id"
                  class="px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  @click="$emit('delete', cls)"
                >
                  {{ isDeleting === cls.id ? "..." : "Hapus" }}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>