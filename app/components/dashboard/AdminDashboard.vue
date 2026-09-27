<!-- app/components/dashboard/AdminDashboard.vue -->
<script setup lang="ts">
const { user } = useAuth();

const { data: stats, pending } = await useFetch("/api/dashboard/stats", {
  default: () => ({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    totalAnnouncements: 0,
    totalSubjects: 0,
  }),
});

const quickActions = [
  {
    label: "Kelola Siswa",
    icon: "heroicons:users",
    to: "/dashboard/students",
    color: "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
  },
  {
    label: "Kelola Guru",
    icon: "heroicons:academic-cap",
    to: "/dashboard/teachers",
    color: "bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
  },
  {
    label: "Kelola Kelas",
    icon: "heroicons:building-library",
    to: "/dashboard/classes",
    color: "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
  },
  {
    label: "Mata Pelajaran",
    icon: "heroicons:book-open",
    to: "/dashboard/subjects",
    color: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
  },
  {
    label: "Pengguna",
    icon: "heroicons:user-circle",
    to: "/dashboard/users",
    color: "bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-400",
  },
];

const statsCards = computed(() => [
  {
    label: "Total Siswa",
    value: stats.value?.totalStudents ?? 0,
    icon: "heroicons:users",
    color: "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
  },
  {
    label: "Total Guru",
    value: stats.value?.totalTeachers ?? 0,
    icon: "heroicons:academic-cap",
    color: "bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
  },
  {
    label: "Total Kelas",
    value: stats.value?.totalClasses ?? 0,
    icon: "heroicons:building-library",
    color: "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
  },
  {
    label: "Mata Pelajaran",
    value: stats.value?.totalSubjects ?? 0,
    icon: "heroicons:book-open",
    color: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
  },
]);
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-start justify-between">
      <div>
        <h1 class="text-2xl font-bold text-slate-800 dark:text-slate-100">
          Selamat datang, {{ user?.name }}
        </h1>
        <p class="text-slate-500 dark:text-slate-400 mt-1">
          Berikut ringkasan aktivitas sekolah hari ini
        </p>
      </div>
      <span
        class="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300"
      >
        Administrator
      </span>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div
        v-for="card in statsCards"
        :key="card.label"
        class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:shadow-md transition-shadow"
      >
        <div
          :class="[
            'w-10 h-10 rounded-lg flex items-center justify-center',
            card.color,
          ]"
        >
          <Icon :name="card.icon" class="w-5 h-5" />
        </div>
        <div class="mt-3">
          <div
            v-if="pending"
            class="h-8 w-16 bg-slate-100 dark:bg-slate-700 rounded animate-pulse"
          />
          <div v-else class="text-2xl font-bold text-slate-800 dark:text-slate-100">
            {{ card.value }}
          </div>
          <div class="text-xs text-slate-500 dark:text-slate-400 mt-1">{{ card.label }}</div>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div>
      <h2 class="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-3">Aksi Cepat</h2>
      <div class="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <NuxtLink
          v-for="action in quickActions"
          :key="action.to"
          :to="action.to"
          class="flex flex-col items-center gap-2 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:shadow-md transition-all duration-200"
        >
          <Icon :name="action.icon" class="w-7 h-7 text-slate-600 dark:text-slate-300" />
          <span class="text-sm font-medium text-slate-700 dark:text-slate-300 text-center">
            {{ action.label }}
          </span>
        </NuxtLink>
      </div>
    </div>

    <!-- Info -->
    <div class="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-5 text-white">
      <Icon name="heroicons:academic-cap" class="w-8 h-8" />
      <h3 class="font-semibold mt-2">Talentia School</h3>
      <p class="text-emerald-50 text-sm mt-1 leading-relaxed max-w-lg">
        Platform manajemen sekolah modern. Kelola data siswa, guru, kelas, mata pelajaran, dan pengguna dengan mudah.
      </p>
      <div class="mt-3 pt-3 border-t border-emerald-400/30 max-w-xs">
        <div class="flex justify-between text-xs">
          <span class="text-emerald-100">Versi</span>
          <span class="font-medium">1.0.0</span>
        </div>
        <div class="flex justify-between text-xs mt-1">
          <span class="text-emerald-100">Status</span>
          <span class="font-medium"><Icon name="heroicons:check-circle" class="w-3.5 h-3.5 inline" /> Aktif</span>
        </div>
      </div>
    </div>
  </div>
</template>