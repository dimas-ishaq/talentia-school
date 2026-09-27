<script setup lang="ts">
import { parseVideoUrl } from '~/utils/video'
import { pesanDariError } from '~/composables/useStudents'

const route = useRoute()
const courseId = computed(() => String(route.params.id))
const activityId = computed(() => String(route.params.activityId))
const { data, pending, error, refresh } = await useFetch(() => `/api/courses/${courseId.value}`, { key: `activity-${courseId.value}` })
const course = computed<any>(() => data.value?.data)
const activity = computed<any>(() => course.value?.sections?.flatMap((s: any) => s.activities ?? []).find((a: any) => a.id === activityId.value))
const section = computed<any>(() => course.value?.sections?.find((s: any) => s.activities?.some((a: any) => a.id === activityId.value)))

const { isStudent, isAdmin, isTeacher } = useAuth()
const canManage = computed(() => isAdmin.value || isTeacher.value)
const { confirm } = useConfirm()

const submission = ref('')
const saving = ref(false)
const errorMessage = ref('')

const completed = computed(() => !!activity.value?.progress?.completedAt)
const video = computed(() => activity.value?.type === 'video' ? parseVideoUrl(activity.value.url || '') : null)
const needsManualComplete = computed(() => activity.value?.type === 'link' && activity.value.linkCompletionRule === 'complete')
const canSubmit = computed(() => isStudent.value && activity.value?.type === 'assignment')

function attachments(raw: unknown): { name: string; url: string }[] {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    return Array.isArray(parsed) ? parsed.filter((x) => x?.url) : []
  } catch { return [] }
}
const isPdfUrl = (url: string) => /\.pdf(?:$|[?#])/i.test(url)
const fileResources = computed(() => [
  ...attachments(activity.value?.attachments),
  ...(activity.value?.type === 'file' && activity.value?.url ? [{ name: activity.value.title, url: activity.value.url }] : []),
])

function init() { submission.value = activity.value?.progress?.submission ?? '' }
watch(activity, init, { immediate: true })

// Aktivitas non-submit dihitung selesai saat dibuka.
onMounted(async () => {
  if (!isStudent.value || !activity.value) return
  if (activity.value.type === 'link' && activity.value.linkCompletionRule === 'view') {
    if (!activity.value.progress?.completedAt) await $fetch(`/api/courses/${courseId.value}/activities/${activityId.value}/complete`, { method: 'POST' })
  } else if (!activity.value.progress?.viewedAt) {
    await $fetch(`/api/courses/${courseId.value}/activities/${activityId.value}/submit`, { method: 'POST' })
  }
  await refresh()
})

// Klik link pada mode "klik link = selesai" langsung mencatat progress lalu membuka tab.
async function openLink() {
  if (isStudent.value && activity.value?.type === 'link' && activity.value.linkCompletionRule === 'view' && !completed.value) {
    await $fetch(`/api/courses/${courseId.value}/activities/${activityId.value}/complete`, { method: 'POST' })
    await refresh()
  }
  window.open(activity.value?.url, activity.value?.linkOpenInNewTab === false ? '_self' : '_blank', 'noopener,noreferrer')
}

async function markComplete() {
  if (completed.value || saving.value) return
  saving.value = true
  errorMessage.value = ''
  try {
    await $fetch(`/api/courses/${courseId.value}/activities/${activityId.value}/complete`, { method: 'POST' })
    await refresh()
  } catch (e: unknown) {
    errorMessage.value = pesanDariError(e, 'Gagal menyimpan progress')
  } finally { saving.value = false }
}

async function submit() {
  if (!submission.value.trim() || saving.value) return
  saving.value = true
  errorMessage.value = ''
  try {
    await $fetch(`/api/courses/${courseId.value}/activities/${activityId.value}/submit`, { method: 'POST', body: { submission: submission.value } })
    await refresh()
  } catch (e: unknown) {
    errorMessage.value = pesanDariError(e, 'Gagal mengirim submission')
  } finally { saving.value = false }
}

async function remove() {
  if (!activity.value || !await confirm({ title: 'Hapus activity?', message: `Hapus "${activity.value.title}"? Data progress siswa ikut terhapus.`, confirmLabel: 'Ya, hapus', tone: 'danger' })) return
  try {
    await $fetch(`/api/courses/${courseId.value}/sections/${section.value.id}/activities/${activityId.value}`, { method: 'DELETE' })
    await navigateTo(`/dashboard/courses/${courseId.value}`)
  } catch (e: unknown) {
    errorMessage.value = pesanDariError(e, 'Gagal menghapus activity')
  }
}
</script>

<template>
  <div class="mx-auto max-w-4xl space-y-4">
    <div v-if="pending" class="h-48 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-700" />
    <div v-else-if="error || !activity" class="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
      Activity tidak ditemukan. <NuxtLink :to="`/dashboard/courses/${courseId}`" class="underline">Kembali ke course</NuxtLink>
    </div>
    <template v-else>
      <header class="flex items-center gap-3">
        <NuxtLink :to="`/dashboard/courses/${courseId}`" class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700">
          <Icon name="heroicons:arrow-left" class="h-4 w-4" />
        </NuxtLink>
        <div class="min-w-0">
          <p class="truncate text-xs text-slate-500">{{ course?.name }} · {{ section?.title }}</p>
          <h1 class="truncate text-xl font-bold text-slate-800 dark:text-slate-100">{{ activity.title }}</h1>
        </div>
        <div class="ml-auto flex items-center gap-2">
          <NuxtLink v-if="canManage" :to="`/dashboard/courses/${courseId}/activities/${activityId}/edit`" class="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-600">Edit</NuxtLink>
          <button v-if="canManage" type="button" class="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-900/20" @click="remove">Hapus</button>
        </div>
      </header>

      <article class="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <header class="border-b border-slate-100 px-5 py-5 dark:border-slate-700">
          <div class="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span class="rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">{{ activity.type }}</span>
            <span v-if="activity.readingMinutes">· {{ activity.readingMinutes }} menit baca</span>
            <span v-if="activity.points != null">· {{ activity.points }} poin</span>
            <span v-if="activity.dueDate">· tenggat {{ new Date(activity.dueDate).toLocaleString('id-ID') }}</span>
          </div>
        </header>

        <div v-if="activity.content" class="whitespace-pre-wrap px-5 py-6 text-sm leading-6 text-slate-700 dark:text-slate-300">{{ activity.content }}</div>

        <VideoPreview v-if="activity.type === 'video'" :video="video" class="mx-5 mb-6" />

        <div v-if="activity.type === 'file' && fileResources.length" class="space-y-2 border-t border-slate-100 px-5 py-5 dark:border-slate-700">
          <h2 class="text-sm font-bold text-slate-700 dark:text-slate-200">File</h2>
          <template v-for="file in fileResources" :key="file.url">
            <iframe v-if="isPdfUrl(file.url)" :src="file.url" :title="file.name" class="h-[70vh] w-full rounded-lg border border-slate-200 dark:border-slate-600" />
            <div class="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-600">
              <Icon name="heroicons:paper-clip" class="h-4 w-4 shrink-0 text-slate-400" />
              <span class="flex-1 truncate text-sm text-slate-700 dark:text-slate-200">{{ file.name }}</span>
              <a :href="file.url" target="_blank" rel="noopener" class="text-sm font-semibold text-emerald-600 underline dark:text-emerald-400">Buka</a>
              <a :href="file.url" download class="text-sm font-semibold text-emerald-600 underline dark:text-emerald-400">Download</a>
            </div>
          </template>
        </div>

        <div v-if="activity.url" class="border-t border-slate-100 px-5 py-5 dark:border-slate-700">
          <a
            v-if="activity.type === 'link'"
            :href="activity.url"
            :target="activity.linkOpenInNewTab === false ? '_self' : '_blank'"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
            @click.prevent="openLink"
          >
            <Icon name="heroicons:arrow-top-right-on-square" class="h-4 w-4" /> Buka link
          </a>
          <a v-else :href="activity.url" target="_blank" rel="noopener" class="text-sm font-semibold text-emerald-600 underline dark:text-emerald-400">Buka link</a>
          <p v-if="activity.url" class="mt-2 truncate text-xs text-slate-400">{{ activity.url }}</p>
        </div>

        <div v-if="canSubmit" class="space-y-2 border-t border-slate-100 px-5 py-5 dark:border-slate-700">
          <label class="text-sm font-semibold text-slate-700 dark:text-slate-300">Submission</label>
          <textarea v-model="submission" class="field h-28" placeholder="Masukkan link file atau jawaban" />
          <button class="btn-primary" :disabled="saving || !submission.trim()" @click="submit">{{ saving ? 'Mengirim...' : 'Kirim submission' }}</button>
        </div>
      </article>

      <p v-if="errorMessage" class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">{{ errorMessage }}</p>

      <div v-if="isStudent && needsManualComplete" class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <span class="flex items-center gap-2 text-sm" :class="completed ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'">
          <Icon :name="completed ? 'heroicons:check-circle' : 'heroicons:clock'" class="h-5 w-5" />{{ completed ? 'Link sudah ditandai selesai' : 'Belum ditandai selesai' }}
        </span>
        <button class="btn-primary" :disabled="completed || saving" @click="markComplete">{{ completed ? 'Selesai' : saving ? 'Menyimpan...' : 'Tandai selesai' }}</button>
      </div>
    </template>
  </div>
</template>

<style scoped>
@reference "../../../assets/css/tailwind.css";

.field { @apply w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200; }
.btn-primary { @apply rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50; }
</style>
