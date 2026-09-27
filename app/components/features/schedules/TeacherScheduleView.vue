<!-- app/components/features/schedules/TeacherScheduleView.vue
  Jadwal untuk GURU: read-only, filter jadwal mengajar guru ini. -->
<script setup lang="ts">
import { DAYS } from '~/types/schedule'

const props = defineProps<{
  className?: string // optional header label
}>()

// Guru pakai komposable yang sama (role-aware): hanya jadwal mengajar dirinya
const s = useSchedules()

const activeDay = ref(1)
s.dayOfWeek.value = activeDay.value
const activeDayLabel = computed(() => DAYS.find(d => d.value === activeDay.value)?.label ?? '')

const scheduleForDay = computed(() => s.schedules.value
  .filter(i => !s.dayOfWeek.value || i.dayOfWeek === s.dayOfWeek.value)
  .sort((a, b) => a.startTime.localeCompare(b.startTime)))

</script>

<template>
  <div class="space-y-5">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-slate-800 dark:text-slate-100">{{ className || 'Jadwal Mengajar Saya' }}</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Lihat jadwal pelajaran yang diampu hari ini</p>
      </div>
    </div>

    <!-- Day tabs -->
    <div class="flex flex-wrap items-center gap-2 overflow-x-auto">
      <button v-for="d in DAYS" :key="d.value" :class="['px-3 py-2 rounded-lg text-sm font-semibold border transition-colors whitespace-nowrap', activeDay === d.value ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700']" @click="activeDay = d.value; s.dayOfWeek.value = d.value">
        {{ d.label }}
      </button>
    </div>

    <!-- Toast -->
    <div v-if="s.pesanSukses.value" class="flex items-center justify-between gap-3 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-lg px-4 py-3 text-sm text-emerald-800 dark:text-emerald-300">
      <span>{{ s.pesanSukses.value }}</span>
      <button class="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-200 font-bold" @click="s.tutupToast()">×</button>
    </div>
    <div v-if="s.pesanError.value" class="flex items-center justify-between gap-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 text-sm text-red-700 dark:text-red-300">
      <span>{{ s.pesanError.value }}</span>
      <button class="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-200 font-bold" @click="s.tutupToast()">×</button>
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
    <div v-else-if="scheduleForDay.length === 0" class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
      <Icon name="heroicons:calendar-days" class="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
      <p class="text-slate-600 dark:text-slate-300 font-medium">{{ activeDayLabel }} tidak ada jadwal</p>
      <p class="text-sm text-slate-400 dark:text-slate-500 mt-1">Belum ada jadwal mengajar pada hari ini.</p>
    </div>

    <!-- List cards -->
    <div v-else class="space-y-3">
      <div v-for="item in scheduleForDay" :key="item.id" class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:shadow-md transition-shadow" :class="!item.isActive ? 'opacity-50' : ''">
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <div class="inline-block px-2 py-1 rounded text-xs font-mono font-semibold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">{{ item.subjectCode }}</div>
              <span class="font-bold text-slate-800 dark:text-slate-200 truncate">{{ item.subjectName }}</span>
            </div>
            <p class="text-sm text-slate-600 dark:text-slate-300 mt-1">{{ item.className }} • Ruang: {{ item.room || '-' }}</p>
          </div>
          <div class="shrink-0 text-right">
            <div class="text-lg font-bold text-slate-900 dark:text-slate-100">{{ item.startTime }}</div>
            <div class="text-sm text-slate-500 dark:text-slate-400">— {{ item.endTime }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>