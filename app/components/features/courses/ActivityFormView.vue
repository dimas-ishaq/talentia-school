<script setup lang="ts">
import { pesanDariError } from '~/composables/useStudents'
import { compressImage } from '~/utils/imageCompress'
import { JAKARTA_INPUT_PATTERN, fromJakartaInput, isValidJakartaInput, toJakartaInput } from '~/utils/datetime'
import { parseVideoUrl } from '~/utils/video'

const route = useRoute()
const courseId = computed(() => String(route.params.id))
const activityId = computed(() => (route.params.activityId ? String(route.params.activityId) : null))
const isEdit = computed(() => !!activityId.value)

const { data: courseData } = await useFetch<any>(() => `/api/courses/${courseId.value}`, { key: `activity-form-course-${courseId.value}` })

const course = computed<any>(() => courseData.value?.data)
const sections = computed<any[]>(() => course.value?.sections ?? [])
const existingActivity = computed<any>(() => {
  if (!activityId.value) return null
  return sections.value.flatMap((s: any) => s.activities ?? []).find((a: any) => a.id === activityId.value) ?? null
})

const sectionId = computed(() => {
  const q = route.query.section
  if (q) return String(q)
  return existingActivity.value?.sectionId ?? ''
})
const currentSection = computed(() => sections.value.find((s: any) => s.id === sectionId.value))

const icons: Record<string, string> = { text: 'heroicons:document-text', file: 'heroicons:paper-clip', video: 'heroicons:video-camera', quiz: 'heroicons:question-mark-circle', assignment: 'heroicons:pencil-square', forum: 'heroicons:chat-bubble-left-right', presentation: 'heroicons:presentation-chart-bar', link: 'heroicons:link' }
const submitTypes = ['assignment', 'quiz', 'forum']
const typeMeta: Record<string, { label: string; contentLabel: string; contentPlaceholder: string; urlLabel: string; urlPlaceholder: string }> = {
  text: { label: 'Materi Teks', contentLabel: 'Materi', contentPlaceholder: 'Tulis materi pembelajaran...', urlLabel: 'URL referensi', urlPlaceholder: 'https://...' },
  file: { label: 'File', contentLabel: 'Instruksi File', contentPlaceholder: 'Jelaskan file atau instruksi membaca...', urlLabel: 'URL File', urlPlaceholder: 'https://drive.google.com/...' },
  video: { label: 'Video', contentLabel: 'Deskripsi Video', contentPlaceholder: 'Jelaskan isi video...', urlLabel: 'URL Video', urlPlaceholder: 'https://youtube.com/...' },
  quiz: { label: 'Kuis', contentLabel: 'Pertanyaan / Instruksi Kuis', contentPlaceholder: 'Tulis pertanyaan atau instruksi kuis...', urlLabel: 'URL Kuis', urlPlaceholder: 'https://...' },
  assignment: { label: 'Tugas', contentLabel: 'Instruksi Tugas', contentPlaceholder: 'Jelaskan tugas yang harus dikerjakan siswa...', urlLabel: 'URL Referensi', urlPlaceholder: 'https://...' },
  forum: { label: 'Forum', contentLabel: 'Topik Diskusi', contentPlaceholder: 'Tulis topik atau pertanyaan diskusi...', urlLabel: 'URL Referensi', urlPlaceholder: 'https://...' },
  presentation: { label: 'Presentasi', contentLabel: 'Deskripsi Presentasi', contentPlaceholder: 'Jelaskan materi presentasi...', urlLabel: 'URL Presentasi', urlPlaceholder: 'https://...' },
  link: { label: 'Link', contentLabel: 'Deskripsi Link', contentPlaceholder: 'Jelaskan link ini...', urlLabel: 'URL Link', urlPlaceholder: 'https://...' },
}

// Materi teks hanya dinilai bila guru mengaktifkan opsi ini.
const isGraded = ref(false)

const form = reactive({
  type: 'text',
  title: '',
  content: '',
  url: '',
  readingMinutes: null as number | string | null,
  attachments: [] as { name: string; url: string; kind: string }[],
  newAttachmentUrl: '',
  points: null as number | string | null,
  dueDate: '',
  isRequired: true,
  isVisible: true,
  // Pengaturan khusus quiz
  maxPoint: 100,
  durationMinutes: null as number | string | null,
  openAt: '',
  closeAt: '',
  hasWindow: false,
  maxAttempts: 1 as number | string | null,
  unlimitedAttempts: false,
  examMode: false,
  fullscreenMode: false,
  quizPassword: '',
  quizInstructions: '',
  hasPassword: false,
  clearPassword: false,
  scoreVisibility: 'immediate' as 'immediate' | 'after_close' | 'never',
  reviewMode: 'immediate' as 'immediate' | 'after_close' | 'never',
  status: 'draft' as 'draft' | 'published',
  forumRequirePost: false,
  forumRequireReply: false,
  forumCompletionRule: 'view' as 'view' | 'post' | 'reply',
  linkCompletionRule: 'view' as 'view' | 'complete',
  linkOpenInNewTab: true,
})

const videoInfo = computed(() => form.type === 'video' ? parseVideoUrl(form.url) : null)
const videoLoading = ref(false)
const videoError = ref('')
let videoTimer: ReturnType<typeof setTimeout> | undefined
watch(() => form.url, (url) => {
  videoError.value = ''
  if (form.type !== 'video' || !url.trim()) return
  clearTimeout(videoTimer)
  videoTimer = setTimeout(async () => {
    const parsed = parseVideoUrl(url)
    if (!parsed) { videoError.value = 'URL harus berupa YouTube, Vimeo, atau file video langsung.'; return }
    if (parsed.provider === 'youtube' && !form.title.trim()) {
      videoLoading.value = true
      try {
        const metadata = await $fetch<{ data?: { title?: string } }>('/api/video/metadata', { method: 'POST', body: { url } })
        if (metadata.data?.title && !form.title.trim()) form.title = metadata.data.title.slice(0, 200)
      } catch { /* Preview tetap dapat digunakan tanpa metadata. */ } finally { videoLoading.value = false }
    }
  }, 400)
})

const videoFileUploading = ref(false)
async function uploadVideo(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  videoError.value = ''
  if (!['video/mp4', 'video/webm'].includes(file.type)) { videoError.value = 'Gunakan MP4 atau WebM.'; input.value = ''; return }
  videoFileUploading.value = true
  try {
    const body = new FormData(); body.append('file', file)
    const response = await $fetch<{ data: { url: string } }>('/api/uploads', { method: 'POST', body })
    form.url = response.data.url
  } catch (error: any) { videoError.value = error?.data?.statusMessage || 'Gagal mengunggah video.' }
  finally { videoFileUploading.value = false; input.value = '' }
}

// Parsing lampiran dari server
function parseAttachments(raw: unknown): { name: string; url: string; kind: string }[] {
  if (!raw) return []
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    return Array.isArray(parsed) ? parsed.filter((x) => x && x.url) : []
  } catch { return [] }
}

function addAttachmentUrl() {
  const v = form.newAttachmentUrl.trim()
  if (!v || form.attachments.length >= 20) return
  if (!/^https?:\/\//i.test(v)) { errorMessage.value = 'Link lampiran harus diawali http:// atau https://'; return }
  errorMessage.value = ''
  form.attachments.push({ name: v.split('/').pop() || 'Lampiran', url: v, kind: 'file' })
  form.newAttachmentUrl = ''
}
function removeAttachment(i: number) { form.attachments.splice(i, 1) }

const uploading = ref(false)
const uploadProgress = ref({ done: 0, total: 0 })
const allowedUploadTypes = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.png,.jpg,.jpeg,.gif,.webp'

async function uploadFiles(files: File[]) {
  const remaining = Math.max(0, 20 - form.attachments.length)
  const selected = files.slice(0, remaining)
  if (!selected.length) return
  uploading.value = true
  uploadProgress.value = { done: 0, total: selected.length }
  errorMessage.value = ''
  const errors: string[] = []
  try {
    for (const original of selected) {
      try {
        // Kompres gambar raster; dokumen dibiarkan apa adanya.
        const file = original.type.startsWith('image/') ? await compressImage(original) : original
        const body = new FormData()
        body.append('file', file)
        const res = await $fetch<{ data: { name: string; url: string; kind: string } }>('/api/uploads', { method: 'POST', body })
        form.attachments.push(res.data)
      } catch (err: unknown) {
        errors.push(`${original.name}: ${pesanDariError(err, 'gagal diunggah')}`)
      } finally {
        uploadProgress.value.done++
      }
    }
    if (errors.length) errorMessage.value = errors.join(' | ')
  } finally {
    uploading.value = false
  }
}

function handleUpload(e: Event) {
  const input = e.target as HTMLInputElement
  void uploadFiles(Array.from(input.files ?? []))
  input.value = ''
}

function handleDrop(e: DragEvent) {
  e.preventDefault()
  if (!uploading.value) void uploadFiles(Array.from(e.dataTransfer?.files ?? []))
}


// Prefill tipe dari query (?type=quiz) saat mode tambah
const initialType = String(route.query.type || '')
if (!isEdit.value && initialType && Object.prototype.hasOwnProperty.call(icons, initialType)) {
  form.type = initialType
}

// Prefill saat mode edit
if (existingActivity.value) {
  Object.assign(form, {
    type: existingActivity.value.type,
    title: existingActivity.value.title ?? '',
    content: existingActivity.value.content ?? '',
    url: existingActivity.value.url ?? '',
    readingMinutes: existingActivity.value.readingMinutes ?? null,
    attachments: parseAttachments(existingActivity.value.attachments),
    points: existingActivity.value.points ?? null,
    dueDate: toJakartaInput(existingActivity.value.dueDate),
    isRequired: existingActivity.value.isRequired ?? true,
    isVisible: existingActivity.value.isVisible ?? true,
    maxPoint: existingActivity.value.maxPoint ?? 100,
    durationMinutes: existingActivity.value.durationMinutes ?? null,
    openAt: toJakartaInput(existingActivity.value.openAt),
    closeAt: toJakartaInput(existingActivity.value.closeAt),
    hasWindow: !!(existingActivity.value.openAt || existingActivity.value.closeAt),
    maxAttempts: existingActivity.value.maxAttempts ?? null,
    unlimitedAttempts: existingActivity.value.maxAttempts == null,
    fullscreenMode: existingActivity.value.fullscreenMode ?? false,
    quizPassword: '',
    quizInstructions: existingActivity.value.quizInstructions ?? '',
    hasPassword: !!existingActivity.value.hasPassword,
    examMode: existingActivity.value.examMode ?? false,
    scoreVisibility: existingActivity.value.scoreVisibility ?? 'immediate',
    reviewMode: existingActivity.value.reviewMode ?? 'immediate',
    status: existingActivity.value.status ?? 'draft',
    forumRequirePost: existingActivity.value.forumRequirePost ?? false,
    forumRequireReply: existingActivity.value.forumRequireReply ?? false,
    forumCompletionRule: existingActivity.value.forumCompletionRule ?? 'view',
    linkCompletionRule: existingActivity.value.linkCompletionRule ?? 'view',
    linkOpenInNewTab: existingActivity.value.linkOpenInNewTab ?? true,
  })
  if (existingActivity.value.type === 'text') isGraded.value = existingActivity.value.points != null
}

const errors = computed(() => {
  const e: Record<string, string> = {}
  if (!form.title.trim()) e.title = 'Judul activity wajib diisi'
  else if (form.title.trim().length > 200) e.title = 'Judul maksimal 200 karakter'
  if (form.type === 'text') {
    const plainContent = form.content.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()
    if (!plainContent) e.content = 'Materi bacaan wajib diisi'
    else if (plainContent.length > 10000) e.content = 'Materi maksimal 10.000 karakter'
    if (form.readingMinutes !== '' && form.readingMinutes != null && (Number(form.readingMinutes) < 1 || Number(form.readingMinutes) > 600)) e.readingMinutes = 'Estimasi harus 1–600 menit'
  }
  if (form.type === 'text' && form.url.trim()) e.url = 'Gunakan bagian Lampiran dan sumber tambahan'
  if (form.type === 'video') {
    if (!form.url.trim()) e.url = 'URL video wajib diisi'
    else if (!videoInfo.value) e.url = 'URL video tidak dikenali (YouTube, Vimeo, atau file MP4/WebM/MOV)'
  }
  if (form.type === 'link') {
    if (!/^https?:\/\/\S+$/i.test(form.url.trim())) e.url = 'URL link wajib diawali http:// atau https://'
  }
  return e
})
const isValid = computed(() => Object.keys(errors.value).length === 0)
const quizSettingsValid = computed(() => {
  if (form.type !== 'quiz') return true
  if (Number(form.maxPoint) < 1) return false
  if (form.durationMinutes !== '' && form.durationMinutes != null && Number(form.durationMinutes) < 1) return false
  if (!form.unlimitedAttempts && (form.maxAttempts === '' || form.maxAttempts == null || Number(form.maxAttempts) < 1)) return false
  if (form.hasWindow && form.openAt && form.closeAt && form.closeAt <= form.openAt) return false
  if (form.reviewMode === 'after_close' && !form.closeAt) return false
  if (form.scoreVisibility === 'after_close' && !form.closeAt) return false
  return true
})
const formIsValid = computed(() => isValid.value && quizSettingsValid.value)

const isSubmitting = ref(false)
const errorMessage = ref('')

async function handleSubmit() {
  errorMessage.value = ''
  if (!formIsValid.value || !sectionId.value) return
  isSubmitting.value = true
  try {
    const url = isEdit.value
      ? `/api/courses/${courseId.value}/sections/${sectionId.value}/activities/${activityId.value}`
      : `/api/courses/${courseId.value}/sections/${sectionId.value}/activities`
    const isQuiz = form.type === 'quiz'
    const saved = await $fetch<{ data?: { id: string } }>(url, {
      method: isEdit.value ? 'PATCH' : 'POST',
      body: {
        type: form.type,
        title: form.title.trim(),
        content: form.content.trim(),
        url: isQuiz ? '' : form.url.trim(),
        readingMinutes: form.type === 'text' && form.readingMinutes !== '' && form.readingMinutes != null ? Number(form.readingMinutes) : null,
        attachments: ['text', 'file'].includes(form.type) ? form.attachments : [],
        points: form.type === 'text' && !isGraded.value ? null : (form.points === '' || form.points == null ? null : Number(form.points)),
        dueDate: form.dueDate ? fromJakartaInput(form.dueDate) : '',
        isRequired: form.isRequired,
        isVisible: form.isVisible,
        ...(form.type === 'text' ? { status: form.status } : {}),
        ...(form.type === 'link' ? { linkCompletionRule: form.linkCompletionRule, linkOpenInNewTab: form.linkOpenInNewTab } : {}),
        ...(isQuiz ? {
          maxPoint: Number(form.maxPoint) || 100,
          durationMinutes: form.durationMinutes === '' || form.durationMinutes == null ? null : Number(form.durationMinutes),
          openAt: form.hasWindow && form.openAt ? fromJakartaInput(form.openAt) : null,
          closeAt: form.hasWindow && form.closeAt ? fromJakartaInput(form.closeAt) : null,
          maxAttempts: form.unlimitedAttempts || form.maxAttempts === '' || form.maxAttempts == null ? null : Number(form.maxAttempts),
          examMode: form.examMode,
          fullscreenMode: form.fullscreenMode,
          quizInstructions: form.quizInstructions.trim(),
          ...(form.quizPassword.trim() ? { quizPassword: form.quizPassword.trim() } : form.clearPassword ? { quizPassword: '' } : {}),
          scoreVisibility: form.scoreVisibility,
          reviewMode: form.reviewMode,
          status: form.status,
          forumRequirePost: form.forumRequirePost,
          forumRequireReply: form.forumRequireReply,
          forumCompletionRule: form.forumCompletionRule,
        } : {}),
      },
    })
    const quizId = isEdit.value ? activityId.value : (saved?.data?.id ?? '')
    await navigateTo(isQuiz && quizId ? `/dashboard/courses/${courseId.value}/quizzes/${quizId}` : `/dashboard/courses/${courseId.value}`)
  } catch (e: unknown) {
    errorMessage.value = pesanDariError(e, 'Gagal menyimpan activity')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="mx-auto space-y-5" :class="form.type === 'quiz' ? 'max-w-5xl' : 'max-w-3xl'">
    <div class="flex items-center gap-3">
      <NuxtLink :to="`/dashboard/courses/${courseId}`" class="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"><Icon name="heroicons:arrow-left" class="h-4 w-4" /></NuxtLink>
      <div class="min-w-0">
        <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {{ isEdit ? (form.type === 'quiz' ? 'Edit Quiz' : 'Edit Activity') : (form.type === 'quiz' ? 'Buat Quiz Baru' : (typeMeta[form.type]?.label ? `Tambah ${typeMeta[form.type]?.label}` : 'Tambah Activity')) }}
        </h1>
        <p class="truncate text-xs text-slate-500 dark:text-slate-400">
          <span v-if="course?.name">{{ course.name }}</span>
          <span v-if="currentSection"> · {{ currentSection.title }}</span>
        </p>
      </div>
    </div>

    <div v-if="errorMessage" class="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-700 dark:text-red-300">{{ errorMessage }}</div>
    <div v-if="form.type === 'text' && isEdit" class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
        <span>Mode edit materi teks</span>
        <NuxtLink :to="`/dashboard/courses/${courseId}/read/${activityId}`" target="_blank" class="font-semibold text-emerald-600 hover:underline dark:text-emerald-400">Pratinjau sebagai siswa</NuxtLink>
      </div>

    <form class="space-y-4" @submit.prevent="handleSubmit">
      <section class="space-y-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
        <div>
          <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Judul {{ typeMeta[form.type]?.label ?? '' }} <span class="text-red-500">*</span></label>
          <input
            v-model="form.title" type="text" :placeholder="`Judul ${typeMeta[form.type]?.label ?? 'activity'}`"
            class="h-10 w-full rounded-lg border bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500"
            :class="errors.title ? 'border-red-300 dark:border-red-700' : 'border-slate-200 dark:border-slate-600'"
          >
          <p v-if="errors.title" class="mt-1 text-xs text-red-600 dark:text-red-400">{{ errors.title }}</p>
        </div>

        <div>
          <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">{{ typeMeta[form.type]?.contentLabel ?? 'Konten / Deskripsi' }} <span v-if="form.type === 'text'" class="text-red-500">*</span></label>
          <RichTextEditor v-if="form.type === 'text'" v-model="form.content" :placeholder="typeMeta[form.type]?.contentPlaceholder ?? ''" />
          <textarea v-else v-model="form.content" rows="3" :placeholder="typeMeta[form.type]?.contentPlaceholder ?? 'Isi activity'" class="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          <p v-if="form.type === 'text'" class="mt-1 text-xs text-slate-400">Materi akan ditampilkan aman kepada siswa setelah sanitasi HTML.</p>
           <p v-if="errors.content" class="mt-1 text-xs text-red-600 dark:text-red-400">{{ errors.content }}</p>
        </div>

        <div v-if="['text', 'file'].includes(form.type)">
          <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Estimasi Waktu Baca (menit)</label>
          <input v-model="form.readingMinutes" type="number" min="1" max="600" placeholder="misal 10" class="h-10 w-40 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <p v-if="errors.readingMinutes" class="mt-1 text-xs text-red-600 dark:text-red-400">{{ errors.readingMinutes }}</p>
          <label class="mt-3 mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Lampiran ({{ form.attachments.length }}/20, maks 10 MB per file)</label>
          <ul v-if="form.attachments.length" class="mb-2 space-y-1.5">
            <li v-for="(a, i) in form.attachments" :key="i" class="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-sm dark:bg-slate-700/40">
              <Icon name="heroicons:paper-clip" class="h-4 w-4 shrink-0 text-slate-400" />
              <a :href="a.url" target="_blank" rel="noopener" class="flex-1 truncate text-emerald-600 underline dark:text-emerald-400">{{ a.name }}</a>
              <button type="button" class="text-slate-400 hover:text-red-500" title="Hapus lampiran" @click="removeAttachment(i)"><Icon name="heroicons:x-mark" class="h-4 w-4" /></button>
            </li>
          </ul>
          <div class="flex flex-wrap items-center gap-2" @dragover.prevent @drop="handleDrop">
            <label class="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700">
              <Icon name="heroicons:arrow-up-tray" class="h-4 w-4" /> {{ uploading ? `Mengunggah ${uploadProgress.done}/${uploadProgress.total}...` : 'Upload file' }}
              <input type="file" :accept="allowedUploadTypes" multiple class="hidden" :disabled="uploading" @change="handleUpload">
            </label>
            <span class="text-xs text-slate-400">atau tarik file ke sini / tempel link:</span>
            <div class="flex flex-1 gap-2 min-w-52">
              <input v-model="form.newAttachmentUrl" type="url" placeholder="https://..." class="h-10 flex-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <button type="button" class="h-10 shrink-0 rounded-lg border border-slate-200 px-3 text-sm font-semibold hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700" @click="addAttachmentUrl">Tambah</button>
            </div>
          </div>
        </div>

        <div v-if="form.type !== 'quiz' && form.type !== 'text'">
          <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">{{ typeMeta[form.type]?.urlLabel ?? 'URL' }}</label>
          <div class="flex gap-2">
            <input v-model="form.url" type="url" :placeholder="typeMeta[form.type]?.urlPlaceholder ?? 'https://...'" class="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500">
            <label v-if="form.type === 'video'" class="inline-flex h-10 cursor-pointer items-center whitespace-nowrap rounded-lg border border-slate-200 px-3 text-sm font-semibold hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700">
              {{ videoFileUploading ? 'Mengunggah...' : 'Upload video' }}
              <input type="file" accept="video/mp4,video/webm,video/quicktime" class="hidden" :disabled="videoFileUploading" @change="uploadVideo">
            </label>
          </div>
          <p v-if="form.type === 'video'" class="mt-1 text-xs text-slate-400">YouTube, Vimeo, MP4, WebM, atau MOV.</p>
          <p v-if="errors.url || videoError" class="mt-1 text-xs text-red-600 dark:text-red-400">{{ errors.url || videoError }}</p>
          <VideoPreview v-if="form.type === 'video' && videoInfo" :video="videoInfo" class="mt-3" />
          <p v-if="videoLoading" class="mt-1 text-xs text-slate-400">Mengambil metadata video...</p>
        </div>
      </section>

      <!-- Pengaturan -->
      <section class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
        <label v-if="form.type === 'text'" class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input v-model="isGraded" type="checkbox" class="rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"> Materi ini dinilai
        </label>
        <div v-if="form.type === 'text'" class="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Status</label>
            <select v-model="form.status" class="h-10 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="draft">Draft (tidak terlihat siswa)</option>
              <option value="published">Terbitkan</option>
            </select>
          </div>
        </div>
        <div v-if="form.type !== 'text' || isGraded" class="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Poin</label>
            <input v-model="form.points" type="number" min="0" placeholder="0" class="h-10 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500">
          </div>
          <div>
            <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Tenggat</label>
            <input v-model="form.dueDate" type="text" inputmode="numeric" placeholder="YYYY-MM-DD HH:mm" :pattern="JAKARTA_INPUT_PATTERN" class="h-10 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3 text-sm font-mono focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500">
          </div>
        </div>
        <div class="mt-3 flex flex-wrap gap-x-6 gap-y-2">
          <label class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input v-model="form.isRequired" type="checkbox" class="rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"> Wajib
          </label>
          <label class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input v-model="form.isVisible" type="checkbox" class="rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"> Tampilkan ke siswa
          </label>
        </div>
        <div v-if="form.type === 'link'" class="mt-3 space-y-2 rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 text-sm dark:border-emerald-800 dark:bg-emerald-900/10">
          <p class="font-semibold text-emerald-700 dark:text-emerald-300">Aturan Link</p>
          <label class="block">Penyelesaian link
            <select v-model="form.linkCompletionRule" class="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800">
              <option value="view">Siswa klik link dianggap selesai</option>
              <option value="complete">Siswa harus menandai selesai</option>
            </select>
          </label>
          <label class="flex items-center gap-2"><input v-model="form.linkOpenInNewTab" type="checkbox" class="rounded text-emerald-500"> Buka link di tab baru</label>
        </div>
        <div v-if="form.type === 'forum'" class="mt-3 space-y-2 rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 text-sm dark:border-emerald-800 dark:bg-emerald-900/10">
          <p class="font-semibold text-emerald-700 dark:text-emerald-300">Aturan Forum</p>
          <label class="flex items-center gap-2"><input v-model="form.forumRequirePost" type="checkbox" class="rounded text-emerald-500"> Siswa wajib mengirim pesan</label>
          <label class="flex items-center gap-2"><input v-model="form.forumRequireReply" type="checkbox" class="rounded text-emerald-500"> Siswa wajib membalas diskusi</label>
          <label class="block">Penyelesaian forum
            <select v-model="form.forumCompletionRule" class="field mt-1">
              <option value="view">Cukup membuka forum</option>
              <option value="post">Wajib mengirim pesan</option>
              <option value="reply">Wajib membalas diskusi</option>
            </select>
          </label>
        </div>
        <p class="mt-3 rounded-lg bg-slate-50 dark:bg-slate-700/40 px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
          <template v-if="submitTypes.includes(form.type)">Siswa menyelesaikan activity ini dengan <strong>mengumpulkan</strong> jawaban/submission.</template>
          <template v-else-if="form.type === 'link'">Siswa menyelesaikan activity ini dengan <strong>mengklik link</strong> atau <strong>menandai selesai</strong>.</template>
          <template v-else>Activity ini ditandai <strong>selesai</strong> saat siswa membukanya.</template>
        </p>
      </section>

      <section v-if="form.type === 'quiz'" class="relative space-y-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50 dark:border-slate-700 dark:bg-slate-800 dark:shadow-black/20 sm:p-6">
        <div class="relative -m-5 mb-5 overflow-hidden bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 px-5 py-6 text-white sm:-m-6 sm:mb-6 sm:px-7"><div class="absolute -right-10 -top-16 h-40 w-40 rounded-full bg-white/15 blur-2xl" /><div class="absolute -bottom-20 left-1/3 h-40 w-40 rounded-full bg-black/10 blur-2xl" /><div class="relative flex items-start gap-4"><span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/30"><Icon name="heroicons:adjustments-horizontal" class="h-6 w-6" /></span><div><p class="text-[11px] font-bold uppercase tracking-[0.2em] text-white/70">Quiz setup</p><h2 class="mt-1 text-xl font-bold">Pengaturan quiz</h2><p class="mt-1 text-sm text-white/85">Atur nilai, jadwal, keamanan, dan hasil pengerjaan.</p></div></div></div>
        <div class="grid gap-3 sm:grid-cols-2">
          <label class="block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Nilai maksimum
            <input v-model.number="form.maxPoint" type="number" min="1" class="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:bg-slate-800">
          </label>
          <label class="block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Durasi <span class="font-normal normal-case text-slate-400">(menit, kosong = tanpa batas)</span>
            <input v-model="form.durationMinutes" type="number" min="1" class="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:bg-slate-800">
          </label>
          <label class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 sm:col-span-2"><input v-model="form.hasWindow" type="checkbox" class="rounded text-emerald-500"> Batasi waktu buka/tutup</label>
          <label v-if="form.hasWindow" class="text-xs font-semibold uppercase tracking-wide text-slate-500">Dibuka pada
            <input v-model="form.openAt" type="text" inputmode="numeric" placeholder="YYYY-MM-DD HH:mm" :pattern="JAKARTA_INPUT_PATTERN" class="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-mono dark:border-slate-600 dark:bg-slate-800">
          </label>
          <label v-if="form.hasWindow" class="text-xs font-semibold uppercase tracking-wide text-slate-500">Ditutup pada
            <input v-model="form.closeAt" type="text" inputmode="numeric" placeholder="YYYY-MM-DD HH:mm" :pattern="JAKARTA_INPUT_PATTERN" class="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-mono dark:border-slate-600 dark:bg-slate-800">
          </label>
        </div>
        <div class="grid gap-3 text-sm text-slate-700 dark:text-slate-300 sm:grid-cols-2">
          <label class="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700"><input v-model="form.unlimitedAttempts" type="checkbox" class="rounded text-emerald-500"> Percobaan tanpa batas</label>
          <label v-if="!form.unlimitedAttempts" class="flex items-center gap-2">Maksimal <input v-model="form.maxAttempts" type="number" min="1" max="10" class="h-9 w-20 rounded-lg border px-2 dark:border-slate-600 dark:bg-slate-800"> kali</label>
          <label class="flex items-center gap-2"><input v-model="form.examMode" type="checkbox" class="rounded text-emerald-500"> Exam mode</label>
          <label class="flex items-center gap-2"><input v-model="form.fullscreenMode" type="checkbox" class="rounded text-emerald-500"> Wajib layar penuh</label>
        </div>
        <div>
          <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Aturan / Instruksi Pengerjaan (ditampilkan sebelum mulai)</label>
          <textarea v-model="form.quizInstructions" rows="3" placeholder="Contoh: Kerjakan sendiri, dilarang membuka catatan, jawab semua soal..." class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200" />
        </div>
        <div>
          <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Kata Sandi Quiz (opsional)</label>
          <input v-model="form.quizPassword" type="text" :placeholder="form.hasPassword ? 'Sudah diatur — isi untuk mengganti, biarkan kosong bila tidak diubah' : 'Kosongkan bila quiz tidak dikunci'" class="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">
          <p class="mt-1 text-[11px] text-slate-400">Siswa harus memasukkan kata sandi ini sebelum bisa mulai mengerjakan.</p>
          <label v-if="form.hasPassword" class="mt-2 flex items-center gap-2 text-xs text-slate-500"><input v-model="form.clearPassword" type="checkbox" class="rounded text-emerald-500"> Hapus kata sandi</label>
        </div>
        <label class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300"><input v-model="form.status" type="radio" value="draft"> Draft <input v-model="form.status" type="radio" value="published" class="ml-3"> Published</label>
        <label class="text-xs font-semibold uppercase tracking-wide text-slate-500">Tampilkan Nilai Siswa
          <select v-model="form.scoreVisibility" class="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800">
            <option value="immediate">Setelah siswa mengerjakan</option>
            <option value="after_close">Setelah quiz ditutup</option>
            <option value="never">Jangan tampilkan</option>
          </select>
          <span v-if="form.scoreVisibility === 'after_close' && !form.closeAt" class="mt-1 block text-[11px] font-normal normal-case text-amber-600 dark:text-amber-400">Isi "Ditutup pada" agar nilai bisa muncul.</span>
        </label>
        <label class="text-xs font-semibold uppercase tracking-wide text-slate-500">Review Jawaban
          <select v-model="form.reviewMode" class="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800">
            <option value="immediate">Setelah mengerjakan</option>
            <option value="after_close">Setelah quiz ditutup</option>
            <option value="never">Jangan tampilkan</option>
          </select>
          <span class="mt-1 block text-[11px] font-normal normal-case text-slate-400">Tampilkan jawaban benar/salah dan pembahasan.</span>
        </label>
      </section>

      <p v-if="form.type === 'quiz' && !quizSettingsValid" class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
        Periksa pengaturan kuis: nilai maksimum, percobaan, rentang waktu, serta aturan tampilan nilai/review.
      </p>

      <!-- Actions -->
      <div class="flex items-center justify-end gap-2">
        <NuxtLink :to="`/dashboard/courses/${courseId}`" class="flex h-10 items-center rounded-lg px-4 text-sm font-medium text-slate-600 dark:text-slate-300 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700">Batal</NuxtLink>
        <button type="submit" :disabled="isSubmitting || !formIsValid" class="h-10 rounded-lg bg-emerald-500 px-5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50">
          {{ isSubmitting ? 'Menyimpan...' : (isEdit ? 'Simpan Perubahan' : `Simpan ${typeMeta[form.type]?.label ?? 'Activity'}`) }}
        </button>
      </div>
    </form>
  </div>
</template>
