<script setup lang="ts">
import { sanitizeHtml } from '~/utils/sanitizeHtml'
import { pesanDariError } from '~/composables/useStudents'

const route = useRoute()
const courseId = computed(() => String(route.params.id))
const { returnTo } = useCourseReturn(() => `/dashboard/courses/${courseId.value}`)
const activityId = computed(() => String(route.params.activityId))
const { data, pending, error, refresh } = await useFetch(() => `/api/courses/${courseId.value}`, { key: `reading-${courseId.value}` })
const course = computed<any>(() => data.value?.data)
const activity = computed<any>(() => course.value?.sections?.flatMap((s: any) => s.activities || []).find((a: any) => a.id === activityId.value))
const section = computed<any>(() => course.value?.sections?.find((s: any) => s.activities?.some((a: any) => a.id === activityId.value)))
const { items: breadcrumbItems } = useCourseBreadcrumb({ courseId, activityId, course })
const errorMessage = ref('')
const completing = ref(false)
const { isStudent, isAdmin, isTeacher } = useAuth()
const activityNav = useActivityNavigation(course, activityId, isStudent)
const { confirm } = useConfirm()
const canManage = computed(() => isAdmin.value || isTeacher.value)
const canPreview = computed(() => canManage.value)
const isPreview = computed(() => route.query.preview === '1' && canPreview.value)
const completed = computed(() => !!activity.value?.progress?.completedAt)

const attachments = computed<any[]>(() => {
  if (!activity.value?.attachments) return []
  try { return JSON.parse(activity.value.attachments) || [] } catch { return [] }
})

async function deleteActivity() {
  if (!activity.value || !await confirm({ title: 'Hapus materi?', message: `Yakin ingin menghapus materi "${activity.value.title}"?`, confirmLabel: 'Ya, hapus', tone: 'danger' })) return
  try {
    await $fetch<any>(`/api/courses/${courseId.value}/activities/${activityId.value}`, { method: 'DELETE' })
    await navigateTo(`/dashboard/courses/${courseId.value}`)
  } catch (e: unknown) {
    errorMessage.value = pesanDariError(e, 'Gagal menghapus materi')
  }
}

async function markComplete() {
  if (completed.value || completing.value) return
  completing.value = true
  errorMessage.value = ''
  try {
    await $fetch(`/api/courses/${courseId.value}/activities/${activityId.value}/complete`, { method: 'POST' })
    await refresh()
  } catch (e: unknown) {
    errorMessage.value = pesanDariError(e, 'Gagal menyimpan progress')
  } finally { completing.value = false }
}

onMounted(async () => {
  if (isStudent.value && activity.value && !activity.value.progress?.viewedAt) {
    await $fetch(`/api/courses/${courseId.value}/activities/${activityId.value}/submit`, { method: 'POST' })
    await refresh()
  }
})
</script>

<template>
  <div class="mx-auto max-w-4xl space-y-4">
    <div v-if="pending" class="h-48 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-700" />
    <div v-else-if="error || !activity" class="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">Materi tidak ditemukan. <NuxtLink :to="returnTo" class="underline">Kembali</NuxtLink></div>
    <template v-else>
      <AppBreadcrumb :back-to="returnTo" :items="breadcrumbItems" />
      <div class="flex items-center gap-3">
        <div class="min-w-0"><p class="truncate text-xs text-slate-500 dark:text-slate-400">{{ course?.name }} · {{ section?.title }}</p><h1 class="truncate text-xl font-bold text-slate-800 dark:text-slate-100">{{ activity.title }}</h1></div>
        <span v-if="isPreview" class="ml-auto rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">Pratinjau siswa</span>
        <div class="ml-auto flex items-center gap-2">
          <span v-if="isPreview" class="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">Pratinjau siswa</span>
          <NuxtLink v-if="canManage" :to="`/dashboard/courses/${courseId}/activities/${activityId}/edit`" class="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-600">Edit materi</NuxtLink>
          <button v-if="canManage" type="button" class="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-900/20" @click="deleteActivity">Hapus</button>
        </div>
      </div>

      <article class="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <header class="border-b border-slate-100 px-5 py-5 dark:border-slate-700 sm:px-8">
          <div class="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400"><span class="rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">{{ activity.type === 'file' ? 'Materi File' : 'Materi Bacaan' }}</span><span v-if="activity.readingMinutes">· {{ activity.readingMinutes }} menit baca</span></div>
        </header>
        <div class="reading-content px-5 py-6 text-slate-800 dark:text-slate-200 sm:px-8" v-html="sanitizeHtml(activity.content || '<p>Belum ada isi materi.</p>')" />
        <div v-if="attachments.length" class="border-t border-slate-100 px-5 py-5 dark:border-slate-700 sm:px-8"><h2 class="text-sm font-bold text-slate-700 dark:text-slate-200">Lampiran</h2><div class="mt-2 grid gap-2 sm:grid-cols-2"><a v-for="file in attachments" :key="file.url" :href="file.url" target="_blank" rel="noopener" class="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-emerald-600 hover:bg-emerald-50 dark:border-slate-600 dark:text-emerald-400 dark:hover:bg-emerald-900/20"><Icon name="heroicons:paper-clip" class="h-4 w-4 shrink-0" /><span class="truncate">{{ file.name }}</span></a></div></div>
      </article>

      <div v-if="errorMessage" class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">{{ errorMessage }}</div>
      <ActivityNavigation :previous="activityNav.previous.value" :next="activityNav.next.value" :link="activityNav.link" class="pt-1" />
      <div v-if="isPreview" class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
        Ini tampilan pratinjau. Siswa akan melihat materi ini beserta tombol "Tandai selesai dibaca".
      </div>
      <div v-else class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"><span class="flex items-center gap-2 text-sm" :class="completed ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'"><Icon :name="completed ? 'heroicons:check-circle' : 'heroicons:clock'" class="h-5 w-5" />{{ completed ? 'Materi selesai dibaca' : 'Belum ditandai selesai' }}</span><button class="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50" :disabled="completed || completing" @click="markComplete">{{ completed ? 'Selesai' : completing ? 'Menyimpan...' : 'Tandai selesai dibaca' }}</button></div>
    </template>
  </div>
</template>

<style scoped>
.reading-content :deep(h1), .reading-content :deep(h2), .reading-content :deep(h3) { margin: 1.4rem 0 .6rem; font-weight: 700; line-height: 1.3; }
.reading-content :deep(h1) { font-size: 1.5rem; }
.reading-content :deep(h2) { font-size: 1.25rem; }
.reading-content :deep(h3) { font-size: 1.1rem; }
.reading-content :deep(p) { margin: .8rem 0; }
.reading-content :deep(ul) { list-style: disc; padding-left: 1.5rem; margin: .8rem 0; }
.reading-content :deep(ol) { list-style: decimal; padding-left: 1.5rem; margin: .8rem 0; }
.reading-content :deep(blockquote) { border-left: 3px solid #10b981; color: #64748b; margin: 1rem 0; padding-left: 1rem; }
.reading-content :deep(a) { color: #059669; text-decoration: underline; }
.reading-content :deep(img) { max-height: 28rem; margin: 1rem auto; border-radius: .5rem; }
</style>
