<script setup lang="ts">
import { parseVideoUrl } from '~/utils/video'
import { pesanDariError } from '~/composables/useStudents'
import { sanitizeHtml } from '~/utils/sanitizeHtml'

const route = useRoute()
const courseId = computed(() => String(route.params.id))
const activityId = computed(() => String(route.params.activityId))
const { returnTo } = useCourseReturn(() => `/dashboard/courses/${courseId.value}`)
const { data, pending, error, refresh } = await useFetch(() => `/api/courses/${courseId.value}`, { key: `activity-${courseId.value}` })
const course = computed<any>(() => data.value?.data)
const activity = computed<any>(() => course.value?.sections?.flatMap((s: any) => s.activities ?? []).find((a: any) => a.id === activityId.value))
const section = computed<any>(() => course.value?.sections?.find((s: any) => s.activities?.some((a: any) => a.id === activityId.value)))
const { items: breadcrumbItems } = useCourseBreadcrumb({ courseId, activityId, course })

const { isStudent, isAdmin, isTeacher } = useAuth()
const prevNext = useActivityNavigation(course, activityId, isStudent)
const canManage = computed(() => isAdmin.value || isTeacher.value)
const { confirm } = useConfirm()

const submission = ref('')
const submissionLink = ref('')
const submissionFiles = ref<{ name: string; url: string; kind?: string }[]>([])
const linkError = ref('')
const uploadRef = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const saving = ref(false)
const errorMessage = ref('')

const completed = computed(() => !!activity.value?.progress?.completedAt)
const video = computed(() => activity.value?.type === 'video' ? parseVideoUrl(activity.value.url || '') : null)
const needsManualComplete = computed(() => activity.value?.type === 'link' && activity.value.linkCompletionRule === 'complete')
const canSubmit = computed(() => isStudent.value && activity.value?.type === 'assignment')
const progress = computed<any>(() => activity.value?.progress ?? null)
const isGraded = computed(() => !!progress.value?.gradedAt)
const isReturned = computed(() => !!progress.value?.returnedAt)
const isLocked = computed(() => isGraded.value && !isReturned.value)

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

// Kontainer full-width saat activity presentasi/video (supaya slide tidak kepotong),
// sedangkan activity teks/file tetap max-w-4xl agar mudah dibaca.
const containerClass = computed(() => {
  const type = activity.value?.type
  if (type === 'presentation' || type === 'video') return 'max-w-none'
  return 'max-w-4xl'
})

const allowedUploadTypes = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.png,.jpg,.jpeg,.gif,.webp,.mp4,.webm'

function init() {
  submission.value = activity.value?.progress?.submission ?? ''
  submissionLink.value = activity.value?.progress?.submissionLink ?? ''
  submissionFiles.value = activity.value?.progress?.submissionFiles ?? []
}
async function uploadSubmission(event: Event) {
  const files = Array.from((event.target as HTMLInputElement).files ?? []).slice(0, 5 - submissionFiles.value.length)
  if (!files.length) return
  uploading.value = true; linkError.value = ''
  try {
    for (const file of files) {
      const body = new FormData(); body.append('file', file)
      const res = await $fetch<{ data: { name: string; url: string; kind: string } }>('/api/uploads', { method: 'POST', body })
      submissionFiles.value.push(res.data)
    }
  } catch (e: unknown) { linkError.value = pesanDariError(e, 'Gagal mengunggah file') }
  finally { uploading.value = false; (event.target as HTMLInputElement).value = '' }
}
function removeSubmissionFile(index: number) { submissionFiles.value.splice(index, 1) }
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
  if (saving.value) return
  const link = submissionLink.value.trim()
  if (!submission.value.trim() && !link && !submissionFiles.value.length) {
    errorMessage.value = 'Isi jawaban, link, atau unggah minimal satu file.'
    return
  }
  if (link && !/^https?:\/\/\S+$/i.test(link)) {
    errorMessage.value = 'Link harus diawali http:// atau https://'
    return
  }
  saving.value = true
  errorMessage.value = ''
  try {
    await $fetch(`/api/courses/${courseId.value}/activities/${activityId.value}/submit`, {
      method: 'POST',
      body: {
        submission: submission.value.trim() || undefined,
        submissionLink: link || undefined,
        submissionFiles: submissionFiles.value.length ? submissionFiles.value.map(({ name, url }) => ({ name, url })) : undefined,
      },
    })
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
  <div class="mx-auto w-full space-y-4" :class="containerClass">
    <div v-if="pending" class="h-48 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-700" />
    <div v-else-if="error || !activity" class="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
      Activity tidak ditemukan. <NuxtLink :to="returnTo" class="underline">Kembali</NuxtLink>
    </div>
    <template v-else>
      <AppBreadcrumb :back-to="returnTo" :items="breadcrumbItems" />
      <header class="flex items-center gap-3">
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

        <div v-if="activity.content" class="rich-content min-w-0 max-w-full overflow-hidden px-5 py-6 text-sm leading-6 text-slate-700 dark:text-slate-300" v-html="sanitizeHtml(activity.content)" />

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
          <a v-else-if="activity.type !== 'presentation'" :href="activity.url" target="_blank" rel="noopener" class="text-sm font-semibold text-emerald-600 underline dark:text-emerald-400">Buka link</a>
          <p v-if="activity.type !== 'presentation' && activity.url" class="mt-2 truncate text-xs text-slate-400">{{ activity.url }}</p>
        </div>

        <!-- Presentation viewer: dipisah dari card supaya dapat lebar penuh (slide tidak kepotong). -->
        <PresentationViewer
          v-if="activity.type === 'presentation'"
          class="mb-4"
          :full-width="true"
          :src="activity.presentationSource === 'link' ? '' : (activity.presentationFileUrl || '')"
          :title="activity.title"
          :original-url="activity.presentationOriginalUrl"
          :external-url="activity.presentationSource === 'link' ? activity.url : null"
          fallback-message="Pratinjau slide otomatis tidak tersedia untuk presentasi ini. Silakan gunakan tombol di bawah."
        />

        <div v-if="canSubmit" class="space-y-3 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
          <div class="flex items-center justify-between gap-2">
            <label class="text-sm font-semibold text-slate-700 dark:text-slate-300">Submission</label>
            <span v-if="isLocked" class="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-700 dark:text-slate-400">Sudah dinilai</span>
            <span v-else-if="isReturned" class="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">Perlu revisi</span>
          </div>
          <p v-if="activity.progress?.isLate" class="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">Pengumpulan terlambat (tenggat: {{ new Date(activity.dueDate).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) }})</p>
          <p v-if="activity.progress?.returnedAt" class="rounded-lg bg-orange-50 px-3 py-2 text-xs text-orange-700 dark:bg-orange-900/20 dark:text-orange-300">Tugas dikembalikan: {{ activity.progress.returnReason || 'Harap revisi & kirim ulang.' }}</p>
          <div v-if="progress?.score != null" class="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
            <span class="font-semibold">Nilai: {{ progress.score }}</span>
            <span v-if="progress.feedback" class="ml-2">· {{ progress.feedback }}</span>
          </div>
          <label class="block text-xs font-semibold uppercase tracking-wide text-slate-400">Jawaban teks</label>
          <textarea v-model="submission" :disabled="isLocked" class="field h-28 disabled:opacity-60" placeholder="Tulis jawaban atau rangkuman" />
          <label class="block text-xs font-semibold uppercase tracking-wide text-slate-400">Link (opsional, Drive / GDocs)</label>
          <input v-model="submissionLink" :disabled="isLocked" type="url" placeholder="https://drive.google.com/..." class="field disabled:opacity-60">
          <p v-if="linkError" class="text-xs text-red-600 dark:text-red-400">{{ linkError }}</p>
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wide text-slate-400">File (opsional, maks 5)</label>
            <div v-if="submissionFiles.length" class="mt-2 space-y-1">
              <div v-for="(file, idx) in submissionFiles" :key="file.url" class="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-600">
                <Icon name="heroicons:paper-clip" class="h-4 w-4 shrink-0 text-slate-400" />
                <span class="truncate flex-1 text-slate-700 dark:text-slate-200">{{ file.name }}</span>
                <a :href="file.url" target="_blank" rel="noopener" class="text-emerald-600 underline">Lihat</a>
                <button v-if="!isLocked" type="button" class="text-rose-600 underline" @click="removeSubmissionFile(idx)">Hapus</button>
              </div>
            </div>
            <div v-if="!isLocked" class="mt-2">
              <input ref="uploadRef" type="file" class="hidden" multiple :accept="allowedUploadTypes"> @change="uploadSubmission">
              <button type="button" class="btn-secondary" :disabled="uploading || submissionFiles.length >= 5" @click="uploadRef?.click()">{{ uploading ? 'Mengunggah...' : 'Pilih file' }}</button>
            </div>
          </div>
          <button class="btn-primary" :disabled="saving || isLocked || uploading" @click="submit">{{ saving ? 'Mengirim...' : isReturned ? 'Kirim Revisi' : 'Kirim submission' }}</button>
          <p v-if="isLocked" class="text-xs text-slate-400">Submission dikunci setelah dinilai. Hubungi guru bila butuh revisi.</p>
        </div>
      </article>

      <ActivityNavigation :previous="prevNext.previous.value" :next="prevNext.next.value" :link="prevNext.link" class="pt-1" />

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

.field { @apply w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200; }
.btn-primary { @apply rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50; }
.btn-secondary { @apply rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700; }
</style>
