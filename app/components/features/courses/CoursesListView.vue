<script setup lang="ts">
const { isAdmin, isTeacher } = useAuth()
const { data, pending, refresh } = await useFetch<{ data: any[] }>('/api/courses')

const courses = computed(() => data.value?.data ?? [])
const isManager = computed(() => isAdmin.value || isTeacher.value)
const search = ref('')
const filteredCourses = computed(() => {
  const query = search.value.trim().toLocaleLowerCase()
  if (!query) return courses.value
  return courses.value.filter((course) => `${course.name} ${course.code ?? ''} ${course.description ?? ''}`.toLocaleLowerCase().includes(query))
})

const togglingId = ref<string | null>(null)
const errorMessage = ref('')

async function toggleHidden(course: any) {
  if (togglingId.value) return
  togglingId.value = course.id
  errorMessage.value = ''
  try {
    await $fetch(`/api/courses/${course.id}`, { method: 'PATCH', body: { isActive: !course.isActive } })
    await refresh()
  } catch (e: any) {
    errorMessage.value = e?.data?.statusMessage || 'Gagal mengubah status course'
  } finally {
    togglingId.value = null
  }
}
</script>

<template>
  <div class="space-y-5">
    <div class="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
      <div>
        <h1 class="text-2xl font-bold text-slate-800 dark:text-slate-100">
          {{ isManager ? 'Course' : 'Course Saya' }}
        </h1>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Kelola pembelajaran berbasis course.</p>
      </div>
      <NuxtLink
        v-if="isManager"
        to="/dashboard/courses/create"
        class="justify-self-start rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 md:justify-self-end"
      >
        Buat Course
      </NuxtLink>
    </div>

    <Transition name="fade" appear>
      <div v-if="errorMessage" class="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-300">{{ errorMessage }}</div>
    </Transition>

    <Transition name="fade" appear>
      <div class="grid gap-3 md:grid-cols-[1fr_auto]">
        <input v-model="search" type="search" placeholder="Cari course berdasarkan nama, kode, atau deskripsi..." class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700">
        <Transition name="fade" mode="out-in">
          <span v-if="search" :key="filteredCourses.length" class="self-center text-xs text-slate-500 dark:text-slate-400">{{ filteredCourses.length }} hasil</span>
        </Transition>
      </div>
    </Transition>

    <Transition name="fade" mode="out-in">
      <!-- Loading -->
      <div v-if="pending" key="loading" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div v-for="i in 4" :key="i" class="h-32 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-700" />
      </div>

      <!-- Empty -->
      <div v-else-if="!filteredCourses.length" key="empty" class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-10 text-center text-sm text-slate-500 dark:text-slate-400">
        {{ search ? `Tidak ada course cocok dengan "${search}".` : 'Belum ada course.' }}
      </div>

      <!-- Course Cards -->
      <div v-else key="courses" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <TransitionGroup name="card" tag="div" class="contents">
          <div v-for="c in filteredCourses" :key="c.id"
            class="group relative flex flex-col overflow-hidden rounded-xl border bg-white transition hover:border-emerald-300 hover:shadow-sm dark:bg-slate-800"
            :class="[isManager && !c.isActive ? 'border-amber-200 dark:border-amber-800' : 'border-slate-200 dark:border-slate-700', isManager && !c.isActive ? 'opacity-80' : '']"
          >
          <NuxtLink :to="`/dashboard/courses/${c.id}`" class="block">
            <div v-if="c.coverUrl" class="h-36 w-full overflow-hidden bg-slate-100 dark:bg-slate-700">
              <img :src="c.coverUrl" alt="" class="h-full w-full object-cover transition duration-300 group-hover:scale-105">
            </div>
            <div v-else class="flex h-36 w-full items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
              <Icon name="heroicons:academic-cap" class="h-12 w-12 opacity-40" />
            </div>
          </NuxtLink>
          <div class="flex flex-1 flex-col p-5">
            <div class="flex flex-wrap gap-2 text-xs font-semibold">
              <span v-if="isManager" class="rounded-full px-2 py-1" :class="c.isActive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'">{{ c.isActive ? 'Tampil' : 'Hidden' }}</span>
              <span v-if="c.sectionCount" class="rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-1 text-slate-600 dark:text-slate-300">{{ c.sectionCount }} section</span>
              <span v-if="c.classCount" class="rounded-full bg-blue-100 dark:bg-blue-900/30 px-2 py-1 text-blue-600 dark:text-blue-300">{{ c.classCount }} kelas</span>
            </div>
            <NuxtLink :to="`/dashboard/courses/${c.id}`" class="mt-3 block font-semibold text-slate-800 group-hover:text-emerald-600 dark:text-slate-100 dark:group-hover:text-emerald-400">{{ c.name }}</NuxtLink>
            <p v-if="c.code" class="mt-1 text-xs text-slate-400 dark:text-slate-500">{{ c.code }}</p>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{{ c.description || 'Belum ada deskripsi.' }}</p>

            <div v-if="!isManager" class="mt-4">
              <div class="flex items-center justify-between text-xs font-semibold">
                <span class="text-slate-500 dark:text-slate-400">{{ c.progress.completed }}/{{ c.progress.total }} activity selesai</span>
                <span class="text-emerald-600 dark:text-emerald-400">{{ c.progress.percent }}%</span>
              </div>
              <div class="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700" role="progressbar" :aria-valuenow="c.progress.percent" aria-valuemin="0" aria-valuemax="100" :aria-label="`Progress ${c.name} ${c.progress.percent}%`">
                <div class="h-full rounded-full bg-emerald-500 transition-all" :style="{ width: `${c.progress.percent}%` }" />
              </div>
            </div>

            <div v-if="isManager" class="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-700">
              <span class="text-xs font-medium" :class="c.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'">{{ c.isActive ? 'Terlihat siswa' : 'Disembunyikan dari siswa' }}</span>
              <button
                type="button"
                class="rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                :class="c.isActive ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300' : 'bg-emerald-500 text-white hover:bg-emerald-600'"
                :disabled="togglingId === c.id"
                @click="toggleHidden(c)"
              >
                {{ togglingId === c.id ? '...' : c.isActive ? 'Sembunyikan' : 'Tampilkan' }}
              </button>
            </div>
          </div>
        </div>
      </TransitionGroup>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
.card-enter-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.card-leave-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
}
.card-enter-from,
.card-leave-to {
  opacity: 0;
  transform: translateY(6px);
}
.card-move {
  transition: transform 0.2s ease;
}
@media (prefers-reduced-motion: reduce) {
  .fade-enter-active,
  .fade-leave-active,
  .card-enter-active,
  .card-leave-active,
  .card-move {
    transition: none;
  }
  .fade-enter-from,
  .fade-leave-to,
  .card-enter-from,
  .card-leave-to {
    transform: none;
  }
}
</style>
