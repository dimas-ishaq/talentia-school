<!-- app/components/dashboard/StudentDashboard.vue -->
<script setup lang="ts">
const { user } = useAuth();

const { data: stats, pending } = await useFetch("/api/dashboard/student-stats", {
  default: () => ({ activeAssignments: 0, pendingQuizzes: 0, averageGrade: 0, attendanceRate: 0 }),
});

const { data: upcomingEvents, pending: loadingUpcoming } = await useFetch<{ data: Array<{ id: string; title: string; startDate: string; endDate?: string; type: string; color: string; isHoliday: boolean; daysUntil: number; source?: string }> }>('/api/calendar/upcoming', {
  default: () => ({ data: [] }),
});
const eventsList = computed(() => upcomingEvents.value?.data ?? []);

const quickActions = [
  { label: "Course Saya", icon: "heroicons:book-open", to: "/dashboard/courses", color: "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" },
  { label: "Tugas Aktif", icon: "heroicons:pencil-square", to: "/dashboard/assignments", color: "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" },
  { label: "Nilai Saya", icon: "heroicons:chart-bar", to: "/dashboard/grades", color: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" },
  { label: "Progress", icon: "heroicons:trending-up", to: "/dashboard/progress", color: "bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400" },
  { label: "Absensi Saya", icon: "heroicons:clipboard-document-check", to: "/dashboard/attendance", color: "bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400" },
];

const statsCards = computed(() => [
  { label: "Tugas Aktif", value: stats.value?.activeAssignments ?? 0, icon: "heroicons:pencil-square", color: "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400", highlight: (stats.value?.activeAssignments ?? 0) > 0 },
  { label: "Kuis Tersedia", value: stats.value?.pendingQuizzes ?? 0, icon: "heroicons:beaker", color: "bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400", highlight: false },
  { label: "Rata-rata Nilai", value: stats.value?.averageGrade ?? 0, icon: "heroicons:chart-bar", color: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400", suffix: "", highlight: false },
  { label: "Kehadiran", value: stats.value?.attendanceRate ?? 0, icon: "heroicons:check-circle", color: "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400", suffix: "%", highlight: false },
]);

const todaySchedule = [
  { time: "07:00 - 08:30", subject: "Matematika", teacher: "Bu Ani", room: "R-101", status: "done" },
  { time: "08:30 - 10:00", subject: "Bahasa Indonesia", teacher: "Pak Budi", room: "R-102", status: "ongoing" },
  { time: "10:15 - 11:45", subject: "IPA", teacher: "Bu Citra", room: "Lab-1", status: "upcoming" },
  { time: "13:00 - 14:30", subject: "IPS", teacher: "Pak Dedi", room: "R-103", status: "upcoming" },
];

const upcomingAssignments = [
  { title: "Tugas Bab 3 - Aljabar", subject: "Matematika", due: "Besok, 23:59", urgent: true },
  { title: "Esai Lingkungan", subject: "Bahasa Indonesia", due: "2 hari lagi", urgent: false },
  { title: "Laporan Praktikum", subject: "IPA", due: "3 hari lagi", urgent: false },
];

const recentGrades = [
  { subject: "Matematika", type: "UTS", score: 90, date: "2 hari lalu" },
  { subject: "Bahasa Indonesia", type: "Tugas", score: 85, date: "3 hari lalu" },
  { subject: "IPA", type: "Kuis", score: 78, date: "5 hari lalu" },
];

const subjectProgress = [
  { subject: "Matematika", progress: 80, color: "bg-blue-500" },
  { subject: "Bahasa Indonesia", progress: 65, color: "bg-emerald-500" },
  { subject: "IPA", progress: 90, color: "bg-purple-500" },
  { subject: "IPS", progress: 45, color: "bg-amber-500" },
];

function getScheduleStatus(status: string) {
  switch (status) {
    case "done": return { label: "Selesai", class: "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400" };
    case "ongoing": return { label: "Berlangsung", class: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300" };
    case "upcoming": return { label: "Akan Datang", class: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" };
    default: return { label: status, class: "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400" };
  }
}

function getGradeColor(score: number) {
  if (score >= 85) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 70) return "text-blue-600 dark:text-blue-400";
  if (score >= 60) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-start justify-between">
      <div>
        <h1 class="text-2xl font-bold text-slate-800 dark:text-slate-100">Hai, {{ user?.name }}</h1>
        <p class="text-slate-500 dark:text-slate-400 mt-1">Semangat belajar hari ini! Berikut ringkasan aktivitasmu</p>
      </div>
      <span class="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">Siswa</span>
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
          <div v-else class="text-2xl font-bold text-slate-800 dark:text-slate-100">{{ card.value }}{{ card.suffix ?? "" }}</div>
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
            <div v-for="(item, i) in todaySchedule" :key="i" class="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
              <div class="w-24 shrink-0">
                <div class="text-xs font-medium text-slate-700 dark:text-slate-300">{{ item.time }}</div>
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-medium text-sm text-slate-800 dark:text-slate-200">{{ item.subject }}</div>
                <div class="text-xs text-slate-500 dark:text-slate-400">{{ item.teacher }} · {{ item.room }}</div>
              </div>
              <span :class="['px-2 py-1 rounded-full text-xs font-medium shrink-0', getScheduleStatus(item.status).class]">{{ getScheduleStatus(item.status).label }}</span>
            </div>
          </div>
        </div>

        <!-- Tugas Deadline Dekat -->
        <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div class="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
            <div class="flex items-center gap-2">
              <h3 class="font-semibold text-slate-800 dark:text-slate-100 text-sm">Deadline Terdekat</h3>
              <span v-if="upcomingAssignments.length" class="px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-xs font-semibold">{{ upcomingAssignments.length }}</span>
            </div>
            <NuxtLink to="/dashboard/assignments" class="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 font-medium">Lihat Semua</NuxtLink>
          </div>
          <div class="p-4 space-y-2">
            <div v-for="(task, i) in upcomingAssignments" :key="i"
              :class="['flex items-center gap-3 p-3 rounded-lg transition-colors',
                task.urgent ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50']">
              <div :class="['w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0',
                task.urgent ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400']">
                <Icon :name="task.urgent ? 'heroicons:exclamation-triangle' : 'heroicons:pencil-square'" class="w-5 h-5" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-medium text-sm text-slate-800 dark:text-slate-200 truncate">{{ task.title }}</div>
                <div class="text-xs text-slate-500 dark:text-slate-400">{{ task.subject }} ·
                  <span :class="task.urgent ? 'text-red-600 dark:text-red-400 font-medium' : ''">{{ task.due }}</span>
                </div>
              </div>
              <NuxtLink to="/dashboard/assignments" class="px-3 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg shrink-0">Kerjakan</NuxtLink>
            </div>
          </div>
        </div>

        <!-- Progress Belajar -->
        <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div class="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
            <h3 class="font-semibold text-slate-800 dark:text-slate-100 text-sm">Progress Belajar</h3>
            <NuxtLink to="/dashboard/progress" class="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 font-medium">Detail</NuxtLink>
          </div>
          <div class="p-4 space-y-4">
            <div v-for="item in subjectProgress" :key="item.subject">
              <div class="flex items-center justify-between mb-1.5">
                <span class="text-sm font-medium text-slate-700 dark:text-slate-300">{{ item.subject }}</span>
                <span class="text-xs font-semibold text-slate-600 dark:text-slate-400">{{ item.progress }}%</span>
              </div>
              <div class="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div :class="['h-full transition-all duration-500', item.color]" :style="{ width: `${item.progress}%` }" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Kolom kanan -->
      <div class="space-y-6">
        <!-- Nilai Terbaru -->
        <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div class="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
            <h3 class="font-semibold text-slate-800 dark:text-slate-100 text-sm">Nilai Terbaru</h3>
            <NuxtLink to="/dashboard/grades" class="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 font-medium">Lihat</NuxtLink>
          </div>
          <div class="p-4 space-y-3">
            <div v-for="(g, i) in recentGrades" :key="i" class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700 last:border-0 last:pb-0">
              <div class="min-w-0 flex-1">
                <div class="font-medium text-sm text-slate-800 dark:text-slate-200 truncate">{{ g.subject }}</div>
                <div class="text-xs text-slate-500 dark:text-slate-400">{{ g.type }} · {{ g.date }}</div>
              </div>
              <div :class="['text-xl font-bold shrink-0 ml-3', getGradeColor(g.score)]">{{ g.score }}</div>
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

        <!-- Pengumuman -->
        <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div class="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
            <h3 class="font-semibold text-slate-800 dark:text-slate-100 text-sm">Pengumuman</h3>
            <NuxtLink to="/dashboard/announcements" class="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 font-medium">Lihat</NuxtLink>
          </div>
          <div class="p-4 space-y-3">
            <div v-for="i in 3" :key="i" class="pb-3 border-b border-slate-100 dark:border-slate-700 last:border-0 last:pb-0">
              <NuxtLink to="/dashboard/announcements" class="font-medium text-sm text-slate-800 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 line-clamp-1">
                {{ ['Ujian Tengah Semester', 'Lomba Sains', 'Libur Nasional'][i - 1] }}
              </NuxtLink>
              <p class="text-xs text-slate-400 dark:text-slate-500 mt-1">{{ i }} hari yang lalu</p>
            </div>
          </div>
        </div>

        <!-- Motivasi Card -->
        <div class="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-4 text-white">
          <Icon name="heroicons:target" class="w-8 h-8" />
          <h3 class="font-semibold mt-2">Semangat!</h3>
          <p class="text-emerald-50 text-xs mt-1 leading-relaxed">Kamu punya {{ stats?.activeAssignments ?? 0 }} tugas aktif. Selesaikan satu per satu, kamu pasti bisa!</p>
        </div>
      </div>
    </div>
  </div>
</template>