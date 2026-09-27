<!-- app/components/dashboard/TeacherDashboard.vue -->
<script setup lang="ts">
const { user } = useAuth()

const { data: stats, pending } = await useFetch('/api/dashboard/teacher-stats', {
  default: () => ({
    totalClasses: 0,
    totalStudents: 0,
    pendingGrading: 0,
    todayAttendance: 0,
  }),
})

const { data: upcomingEvents, pending: loadingUpcoming } = await useFetch<{ data: Array<{ id: string; title: string; startDate: string; endDate?: string; type: string; color: string; isHoliday: boolean; daysUntil: number; source?: string }> }>('/api/calendar/upcoming', {
  default: () => ({ data: [] }),
})
const eventsList = computed(() => upcomingEvents.value?.data ?? [])

const quickActions = [
  { label: 'Input Absensi', icon: 'heroicons:chart-bar', to: '/dashboard/attendance', color: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' },
  { label: 'Koreksi Tugas', icon: 'heroicons:pencil', to: '/dashboard/grading', color: 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' },
  { label: 'Input Nilai', icon: 'heroicons:pencil-square', to: '/dashboard/grades', color: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' },
  { label: 'Buat Pengumuman', icon: 'heroicons:megaphone', to: '/dashboard/announcements?create=1', color: 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' },
]

const statsCards = computed(() => [
  { label: 'Kelas Saya', value: stats.value?.totalClasses ?? 0, icon: 'heroicons:building-library', color: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400', highlight: false },
  { label: 'Total Siswa', value: stats.value?.totalStudents ?? 0, icon: 'heroicons:users', color: 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400', highlight: false },
  { label: 'Perlu Dikoreksi', value: stats.value?.pendingGrading ?? 0, icon: 'heroicons:pencil', color: 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400', highlight: (stats.value?.pendingGrading ?? 0) > 0 },
  { label: 'Hadir Hari Ini', value: stats.value?.todayAttendance ?? 0, icon: 'heroicons:check-circle', color: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400', highlight: false },
])

const todaySchedule = [
  { time: '07:00 - 08:30', subject: 'Matematika', class: '6A', room: 'R-101', status: 'done' },
  { time: '08:30 - 10:00', subject: 'Matematika', class: '6B', room: 'R-102', status: 'ongoing' },
  { time: '10:15 - 11:45', subject: 'Matematika', class: '5A', room: 'R-103', status: 'upcoming' },
  { time: '13:00 - 14:30', subject: 'Matematika', class: '5B', room: 'R-104', status: 'upcoming' },
]

const pendingTasks = [
  { student: 'Citra Siswa', task: 'Tugas Bab 3', class: '6A', submittedAt: '2 jam lalu' },
  { student: 'Fajar Siswa', task: 'Tugas Bab 3', class: '6A', submittedAt: '3 jam lalu' },
  { student: 'Gita Siswa', task: 'Kuis Aljabar', class: '6B', submittedAt: '5 jam lalu' },
]

function getScheduleStatus(status: string) {
  switch (status) {
    case 'done': return { label: 'Selesai', class: 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400' }
    case 'ongoing': return { label: 'Berlangsung', class: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' }
    case 'upcoming': return { label: 'Akan Datang', class: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' }
    default: return { label: status, class: 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400' }
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-start justify-between">
      <div>
        <h1 class="text-2xl font-bold text-slate-800 dark:text-slate-100">
          Selamat pagi, {{ user?.name }}
        </h1>
        <p class="text-slate-500 dark:text-slate-400 mt-1">
          Berikut ringkasan aktivitas mengajar Anda hari ini
        </p>
      </div>
      <span class="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
        Guru
      </span>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div
        v-for="card in statsCards"
        :key="card.label"
        :class="[
          'bg-white dark:bg-slate-800 rounded-xl border p-4 transition-shadow hover:shadow-md',
          card.highlight ? 'border-amber-300 dark:border-amber-700 bg-amber-50/30 dark:bg-amber-900/20' : 'border-slate-200 dark:border-slate-700',
        ]"
      >
        <div :class="['w-10 h-10 rounded-lg flex items-center justify-center', card.color]">
          <Icon :name="card.icon" class="w-5 h-5" />
        </div>
        <div class="mt-3">
          <div v-if="pending" class="h-8 w-16 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
          <div v-else class="text-2xl font-bold text-slate-800 dark:text-slate-100">{{ card.value }}</div>
          <div class="text-xs text-slate-500 dark:text-slate-400 mt-1">{{ card.label }}</div>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div>
      <h2 class="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-3">Aksi Cepat</h2>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <NuxtLink
          v-for="action in quickActions"
          :key="action.to"
          :to="action.to"
          class="flex flex-col items-center gap-2 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:shadow-md transition-all duration-200"
        >
          <Icon :name="action.icon" class="w-7 h-7 text-slate-600 dark:text-slate-300" />
          <span class="text-sm font-medium text-slate-700 dark:text-slate-300 text-center">{{ action.label }}</span>
        </NuxtLink>
      </div>
    </div>

    <!-- 2 Column Section -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Kolom kiri -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Jadwal Hari Ini -->
        <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div class="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
            <h3 class="font-semibold text-slate-800 dark:text-slate-100 text-sm">Jadwal Hari Ini</h3>
            <NuxtLink to="/dashboard/schedule" class="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 font-medium">Lihat Semua</NuxtLink>
          </div>
          <div class="p-4 space-y-2">
            <div
              v-for="(item, i) in todaySchedule"
              :key="i"
              class="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <div class="w-24 shrink-0">
                <div class="text-xs font-medium text-slate-700 dark:text-slate-300">{{ item.time }}</div>
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-medium text-sm text-slate-800 dark:text-slate-200">{{ item.subject }}</div>
                <div class="text-xs text-slate-500 dark:text-slate-400">Kelas {{ item.class }} · {{ item.room }}</div>
              </div>
              <span :class="['px-2 py-1 rounded-full text-xs font-medium shrink-0', getScheduleStatus(item.status).class]">
                {{ getScheduleStatus(item.status).label }}
              </span>
            </div>
            <div v-if="todaySchedule.length === 0" class="text-center py-8 text-sm text-slate-400 dark:text-slate-500">Tidak ada jadwal hari ini</div>
          </div>
        </div>

        <!-- Tugas Perlu Dikoreksi -->
        <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div class="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
            <div class="flex items-center gap-2">
              <h3 class="font-semibold text-slate-800 dark:text-slate-100 text-sm">Perlu Dikoreksi</h3>
              <span v-if="pendingTasks.length" class="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-xs font-semibold">{{ pendingTasks.length }}</span>
            </div>
            <NuxtLink to="/dashboard/grading" class="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 font-medium">Koreksi Semua</NuxtLink>
          </div>
          <div class="p-4 space-y-2">
            <div
              v-for="(task, i) in pendingTasks"
              :key="i"
              class="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <div class="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Icon name="heroicons:pencil" class="w-5 h-5" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-medium text-sm text-slate-800 dark:text-slate-200 truncate">{{ task.student }}</div>
                <div class="text-xs text-slate-500 dark:text-slate-400">{{ task.task }} · Kelas {{ task.class }} · {{ task.submittedAt }}</div>
              </div>
              <NuxtLink to="/dashboard/grading" class="px-3 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg shrink-0">Koreksi</NuxtLink>
            </div>
            <div v-if="pendingTasks.length === 0" class="text-center py-8 text-sm text-slate-400 dark:text-slate-500">
              <Icon name="heroicons:check-circle" class="w-4 h-4 inline text-emerald-500 dark:text-emerald-400" /> Semua tugas sudah dikoreksi
            </div>
          </div>
        </div>
      </div>

      <!-- Kolom kanan -->
      <div class="space-y-6">
        <!-- Kelas Saya -->
        <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div class="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
            <h3 class="font-semibold text-slate-800 dark:text-slate-100 text-sm">Kelas Saya</h3>
            <NuxtLink to="/dashboard/classes" class="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 font-medium">Lihat</NuxtLink>
          </div>
          <div class="p-4 space-y-2">
            <div
              v-for="kelas in [{ name: '6A', students: 30, attendance: 28 }, { name: '6B', students: 28, attendance: 26 }, { name: '5A', students: 32, attendance: 30 }]"
              :key="kelas.name"
              class="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <div class="flex items-center justify-between mb-2">
                <span class="font-medium text-sm text-slate-800 dark:text-slate-200">Kelas {{ kelas.name }}</span>
                <span class="text-xs text-slate-500 dark:text-slate-400">{{ kelas.students }} siswa</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="flex-1 h-1.5 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                  <div class="h-full bg-emerald-500" :style="{ width: `${(kelas.attendance / kelas.students) * 100}%` }" />
                </div>
                <span class="text-xs font-medium text-emerald-600 dark:text-emerald-400">{{ kelas.attendance }}/{{ kelas.students }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Agenda Mendatang -->
        <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div class="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
            <h3 class="font-semibold text-slate-800 dark:text-slate-100 text-sm">Agenda Mendatang</h3>
            <NuxtLink to="/dashboard/calendar" class="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 font-medium">Kalender</NuxtLink>
          </div>
          <div class="p-4 space-y-3">
            <div v-if="loadingUpcoming" class="text-center py-6 text-sm text-slate-400">Memuat...</div>
            <div v-else-if="!eventsList.length" class="text-center py-6 text-sm text-slate-400 dark:text-slate-500">
              <Icon name="heroicons:calendar-days" class="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              Tidak ada agenda 14 hari ke depan
            </div>
            <NuxtLink
              v-for="ev in eventsList"
              :key="ev.id"
              to="/dashboard/calendar"
              class="flex items-start gap-3 pb-3 border-b border-slate-100 dark:border-slate-700 last:border-0 last:pb-0 hover:opacity-80 transition-opacity"
            >
              <span class="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" :style="{ backgroundColor: ev.color }" />
              <div class="min-w-0 flex-1">
                <div class="font-medium text-sm text-slate-800 dark:text-slate-200 line-clamp-1">{{ ev.title }}</div>
                <div class="text-xs text-slate-500 dark:text-slate-400">
                  {{ ev.daysUntil === 0 ? 'Hari ini' : ev.daysUntil === 1 ? 'Besok' : `${ev.daysUntil} hari lagi` }}
                  <span v-if="ev.isHoliday" class="ml-1 text-rose-600 dark:text-rose-400 font-medium">· LIBUR</span>
                </div>
              </div>
            </NuxtLink>
          </div>
        </div>

        <!-- Pengumuman Terbaru -->
        <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div class="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
            <h3 class="font-semibold text-slate-800 dark:text-slate-100 text-sm">Pengumuman</h3>
            <NuxtLink to="/dashboard/announcements" class="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 font-medium">Lihat</NuxtLink>
          </div>
          <div class="p-4 space-y-3">
            <div v-for="i in 3" :key="i" class="pb-3 border-b border-slate-100 dark:border-slate-700 last:border-0 last:pb-0">
              <NuxtLink to="/dashboard/announcements" class="font-medium text-sm text-slate-800 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 line-clamp-1">
                {{ ['Ujian Tengah Semester', 'Rapat Guru', 'Libur Nasional'][i - 1] }}
              </NuxtLink>
              <p class="text-xs text-slate-400 dark:text-slate-500 mt-1">{{ i }} hari yang lalu</p>
            </div>
          </div>
        </div>

        <!-- Tips Card -->
        <div class="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
          <Icon name="heroicons:light-bulb" class="w-8 h-8 text-amber-500" />
          <h3 class="font-semibold mt-2">Tips Hari Ini</h3>
          <p class="text-blue-50 text-xs mt-1 leading-relaxed">Jangan lupa input absensi sebelum jam 08:00 agar orang tua mendapat notifikasi tepat waktu.</p>
        </div>
      </div>
    </div>
  </div>
</template>