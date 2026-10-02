<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: ['auth'], roles: ['student', 'teacher', 'admin', 'org_admin', 'owner'] })

const { isAdmin, isTeacher } = useAuth()
const isTeacherOrAdmin = computed(() => isTeacher.value || isAdmin.value)

const { data: allCourses, refresh } = await useFetch<{ data: any[] }>(() => '/api/courses', { key: 'user-courses-all' })
const courses = computed(() => allCourses.value?.data ?? [])
</script>

<template>
  <div class="space-y-5">
    <header>
      <h1 class="text-xl font-bold text-slate-800 dark:text-slate-100">Nilai Akhir Course</h1>
      <p v-if="isTeacherOrAdmin" class="mt-1 text-sm text-slate-500 dark:text-slate-400">Kelola bobot & hitung nilai akhir di halaman Course masing-masing.</p>
      <p v-else class="mt-1 text-sm text-slate-500 dark:text-slate-400">Lihat nilai akhir course Anda di detail course.</p>
    </header>

    <section v-if="!isTeacherOrAdmin">
      <div v-if="courses.length === 0" class="rounded-xl border border-slate-200 bg-white p-8 dark:border-slate-700 dark:bg-slate-800">
        <p class="text-center text-sm text-slate-500 dark:text-slate-400">Belum ada course aktif.</p>
      </div>
      <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <NuxtLink v-for="c in courses" :key="c.id" :to="`/dashboard/courses/${c.id}`" class="overflow-hidden rounded-xl border border-slate-200 hover:border-emerald-400 hover:shadow-md dark:border-slate-700 dark:hover:border-emerald-600">
          <img v-if="c.coverUrl" :src="c.coverUrl" class="h-32 w-full object-cover">
          <div class="bg-gradient-to-br from-slate-50 to-white p-4 dark:from-slate-800 dark:to-slate-900">
            <h3 class="font-semibold text-slate-800 dark:text-slate-100">{{ c.name }}</h3>
            <p class="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{{ c.description || 'Tidak ada deskripsi.' }}</p>
          </div>
        </NuxtLink>
      </div>
    </section>

    <section v-else>
      <div class="rounded-xl border border-slate-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-slate-700 dark:bg-slate-800 dark:text-blue-300">
        Untuk setiap course: buka course → klik "Nilai Akhir" untuk konfigurasi bobot & re-kalkulasi nilai.
      </div>

      <div v-if="courses.length === 0" class="rounded-xl border border-slate-200 bg-white p-8 dark:border-slate-700 dark:bg-slate-800">
        <p class="text-center text-sm text-slate-500 dark:text-slate-400">Belum ada course.</p>
      </div>
      <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <NuxtLink v-for="c in courses" :key="c.id" :to="`/dashboard/courses/${c.id}/grades`" class="group relative overflow-hidden rounded-xl border border-slate-200 transition hover:border-emerald-400 hover:shadow-md dark:border-slate-700 dark:hover:border-emerald-600">
          <img v-if="c.coverUrl" :src="c.coverUrl" class="h-32 w-full object-cover">
          <div class="absolute right-3 top-3 rounded-full bg-white px-2 py-1 text-[10px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">{{ c.sec_count || 0 }} section</div>
          <div class="bg-gradient-to-br from-slate-50 to-white p-4 dark:from-slate-800 dark:to-slate-900">
            <h3 class="font-semibold text-slate-800 dark:text-slate-100">{{ c.name }}</h3>
            <p class="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{{ c.description || 'Tidak ada deskripsi.' }}</p>
          </div>
          <div class="flex items-center justify-between border-t border-slate-100 bg-emerald-50/50 px-4 py-2 dark:border-slate-700/50 dark:bg-emerald-900/10">
            <span class="text-xs font-medium text-emerald-600 dark:text-emerald-400">Konfigurasi Bobot · Re-kalkulasi</span>
            <Icon name="heroicons:arrow-right" class="h-4 w-4 text-emerald-500 opacity-0 group-hover:opacity-100" />
          </div>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
@reference "~/assets/css/tailwind.css";
.field { @apply w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500; }
</style>
