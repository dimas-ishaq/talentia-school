<script setup lang="ts">
import { parseVideoUrl } from '~/utils/video'

const route = useRoute()
const id = computed(() => String(route.params.id))
const { isAdmin, isTeacher, isStudent } = useAuth()
const { confirm } = useConfirm()
const canManage = computed(() => isAdmin.value || isTeacher.value)
const { data, pending, error, refresh } = await useFetch(() => `/api/courses/${id.value}`, { key: `course-${id.value}` })
const course = computed<any>(() => data.value?.data)
// Navigasi balik dari halaman quiz dapat memulihkan cache Nuxt sebelum payload tersedia.
onMounted(() => { if (!course.value && !error.value) refresh() })
// Ringkasan kursus (jumlah siswa, kelas, rata-rata nilai) - sudah disertakan di payload course
const summary = computed(() => course.value?.summary ?? { studentCount: 0, studentClasses: [], averageScore: null })
const summaryClasses = computed(() => {
  const names = summary.value.studentClasses?.length ? summary.value.studentClasses : (course.value?.classes ?? []).map((x: any) => x.name)
  return names.length ? names.join(', ') : 'Belum ada kelas'
})
// Nilai akhir siswa (hanya untuk siswa)
const { data: myGradeData } = await useAsyncData<{ data: any } | null>(
  `course-my-grade-${id.value}`,
  () => (isStudent.value ? $fetch<{ data: any }>(`/api/courses/${id.value}/my-final-grade`) : Promise.resolve(null)),
  { watch: [isStudent] },
)
const myFinalGrade = computed<any>(() => myGradeData.value?.data ?? null)
const myFinalGradeComponents = computed<Record<string, { average: number; weight: number }>>(() => {
  const raw = myFinalGrade.value?.componentsJson
  if (!raw) return {}
  try { return typeof raw === 'string' ? JSON.parse(raw) : raw } catch { return {} }
})
const { data: allClasses } = await useFetch<{ data: any[] }>('/api/classes')
const { data: allTeachers } = await useFetch<{ data: any[] }>('/api/teachers')
const { data: categoriesData } = await useFetch<{ data: any[] }>('/api/categories')
const { data: subjectsData } = await useFetch<{ data: any[] }>('/api/subjects')
// Daftar kategori diratakan sebagai pohon (induk lalu anak), agar bisa dipilih termasuk parent.
const categoryOptions = computed(() => {
  const categories = categoriesData.value?.data ?? []
  const result: { id: string; label: string }[] = []
  const walk = (parentId: string | null, depth: number) => {
    for (const category of categories.filter((item: any) => (item.parentId || null) === parentId).sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0))) {
      result.push({ id: category.id, label: `${'— '.repeat(depth)}${category.name}` })
      walk(category.id, depth + 1)
    }
  }
  walk(null, 0)
  return result
})
const categoryLabel = computed(() => categoryOptions.value.find((option) => option.id === course.value?.categoryId)?.label.replace(/^(— )+/, '') ?? '-')
const subjectLabel = computed(() => (subjectsData.value?.data ?? []).find((item: any) => item.id === course.value?.subjectId)?.name ?? '-')

const router = useRouter()
const openSections = ref<Record<string, boolean>>({})

function toggleOpenSection(sectionId: string) {
  const isOpen = !openSections.value[sectionId]
  openSections.value[sectionId] = isOpen
  router.replace({
    query: { ...route.query, section: isOpen ? sectionId : undefined },
  })
}

watch(() => route.query.section, (sectionId) => {
  if (typeof sectionId === 'string') openSections.value[sectionId] = true
}, { immediate: true })

const editingCourse = ref(false)
const courseForm = ref({ name: '', code: '', description: '', coverUrl: '', categoryId: null as string | null, subjectId: null as string | null, classIds: [] as string[], teacherIds: [] as string[] })
const showSectionForm = ref(false)
const sectionForm = ref({ title: '', description: '' })
const editingSection = ref<any>(null)
const selectedActivity = ref<any>(null)
const submission = ref('')
const forumDiscussions = ref<any[]>([])
const forumPosts = ref<any[]>([])
const forumDiscussionId = ref<string | null>(null)
const forumTitle = ref('')
const forumQuestion = ref('')
const forumReplyTo = ref<string | null>(null)
const forumLoading = ref(false)
const saving = ref(false)
async function loadForum(activity: any) { forumLoading.value = true; try { const result = await $fetch<any>(`/api/courses/${id.value}/activities/${activity.id}/discussions`); forumDiscussions.value = result.data.discussions; forumPosts.value = result.data.posts; forumDiscussionId.value ||= forumDiscussions.value[0]?.id ?? null } finally { forumLoading.value = false } }
async function createDiscussion() { if (!selectedActivity.value || !forumTitle.value.trim() || !forumQuestion.value.trim()) return; await $fetch(`/api/courses/${id.value}/activities/${selectedActivity.value.id}/discussions`, { method: 'POST', body: { title: forumTitle.value, question: forumQuestion.value } }); forumTitle.value = ''; forumQuestion.value = ''; await loadForum(selectedActivity.value) }
async function submitForumPost() { if (!selectedActivity.value || !forumDiscussionId.value || !submission.value.trim()) return; await $fetch(`/api/courses/${id.value}/activities/${selectedActivity.value.id}/forum`, { method: 'POST', body: { content: submission.value, discussionId: forumDiscussionId.value, parentId: forumReplyTo.value } }); submission.value = ''; forumReplyTo.value = null; await loadForum(selectedActivity.value); await refresh() }
const showActivityPicker = ref(false)
const pickerSectionId = ref('')

const icons: Record<string, string> = { text: 'heroicons:document-text', file: 'heroicons:paper-clip', video: 'heroicons:video-camera', quiz: 'heroicons:question-mark-circle', assignment: 'heroicons:pencil-square', forum: 'heroicons:chat-bubble-left-right', presentation: 'heroicons:presentation-chart-bar', link: 'heroicons:link' }
const activityTypeOptions = [
  { type: 'text', icon: 'heroicons:document-text', label: 'Materi Teks', desc: 'Konten bacaan / penjelasan' },
  { type: 'file', icon: 'heroicons:paper-clip', label: 'File', desc: 'Lampiran dokumen / PDF' },
  { type: 'video', icon: 'heroicons:video-camera', label: 'Video', desc: 'Video pembelajaran / link' },
  { type: 'quiz', icon: 'heroicons:question-mark-circle', label: 'Kuis', desc: 'Soal yang dikumpulkan siswa' },
  { type: 'assignment', icon: 'heroicons:pencil-square', label: 'Tugas', desc: 'Pengumpulan tugas siswa' },
  { type: 'forum', icon: 'heroicons:chat-bubble-left-right', label: 'Forum', desc: 'Diskusi & komentar siswa' },
  { type: 'presentation', icon: 'heroicons:presentation-chart-bar', label: 'Presentasi', desc: 'Slide / materi presentasi' },
  { type: 'link', icon: 'heroicons:link', label: 'Link', desc: 'Link atau URL eksternal' },
]
function startCourseEdit() {
  courseForm.value = {
    name: course.value.name || '',
    code: course.value.code || '',
    description: course.value.description || '',
    coverUrl: course.value.coverUrl || '',
    categoryId: course.value.categoryId || null,
    subjectId: course.value.subjectId || null,
    classIds: (course.value.classes || []).map((item: any) => item.id),
    teacherIds: (course.value.teachers || []).map((item: any) => item.id),
  }
  editingCourse.value = true
}
async function saveCourse() { saving.value = true; try { await $fetch(`/api/courses/${id.value}`, { method: 'PATCH', body: courseForm.value }); editingCourse.value = false; await refresh() } finally { saving.value = false } }
async function saveSection() { if (!sectionForm.value.title.trim()) return; await $fetch(editingSection.value ? `/api/courses/${id.value}/sections/${editingSection.value.id}` : `/api/courses/${id.value}/sections`, { method: editingSection.value ? 'PATCH' : 'POST', body: sectionForm.value }); showSectionForm.value = false; editingSection.value = null; sectionForm.value = { title: '', description: '' }; await refresh() }
function startSectionEdit(section: any) { editingSection.value = section; sectionForm.value = { title: section.title, description: section.description || '' }; showSectionForm.value = true }
async function deleteSection(section: any) { if (!await confirm({ title: 'Hapus section?', message: 'Hapus section ini?', confirmLabel: 'Ya, hapus', tone: 'danger' })) return; await $fetch(`/api/courses/${id.value}/sections/${section.id}`, { method: 'DELETE' }); await refresh() }
function startActivity(sectionId: string, activity?: any) {
  if (activity) return navigateTo(`/dashboard/courses/${id.value}/activities/${activity.id}/edit`)
  pickerSectionId.value = sectionId
  showActivityPicker.value = true
}
async function chooseActivityType(type: string) {
  showActivityPicker.value = false
  await navigateTo({
    path: `/dashboard/courses/${id.value}/activities/create`,
    query: { section: pickerSectionId.value, type },
  })
}
async function deleteActivity(sectionId: string, activity: any) { if (!await confirm({ title: 'Hapus activity?', message: `Hapus materi "${activity.title}"? Data progress siswa ikut terhapus.`, confirmLabel: 'Ya, hapus', tone: 'danger' })) return; await $fetch(`/api/courses/${id.value}/sections/${sectionId}/activities/${activity.id}`, { method: 'DELETE' }); await refresh() }
async function duplicateActivity(sectionId: string, activity: any) { if (activity.type !== 'text') return; await $fetch(`/api/courses/${id.value}/sections/${sectionId}/activities/${activity.id}/duplicate`, { method: 'POST' }); await refresh() }
function activityAttachments(activity: any) {
  if (!activity?.attachments) return []
  try {
    const parsed = typeof activity.attachments === 'string' ? JSON.parse(activity.attachments) : activity.attachments
    return Array.isArray(parsed) ? parsed.filter((file: any) => file?.url) : []
  } catch { return [] }
}

function isPdfUrl(url: string) { return /\.pdf(?:$|[?#])/i.test(url) }
function videoInfo(activity: any) { return activity?.type === 'video' ? parseVideoUrl(activity.url || '') : null }

async function openActivity(activity: any) {
  if (activity.type === 'text') {
    await navigateTo(`/dashboard/courses/${id.value}/read/${activity.id}`)
    return
  }
  if (activity.type === 'link' || activity.type === 'file' || activity.type === 'video' || activity.type === 'presentation') {
    await navigateTo(`/dashboard/courses/${id.value}/activity/${activity.id}`)
    return
  }
  if (activity.type === 'quiz') {
    await navigateTo(isStudent.value
      ? `/dashboard/courses/${id.value}/quizzes/${activity.id}/take`
      : `/dashboard/courses/${id.value}/quizzes/${activity.id}`)
    return
  }
  if (activity.type === 'forum') {
    await navigateTo(`/dashboard/courses/${id.value}/forum/${activity.id}`)
    return
  }
  await navigateTo(`/dashboard/courses/${id.value}/activity/${activity.id}`)
}
async function submitAssignment() { await $fetch(`/api/courses/${id.value}/activities/${selectedActivity.value.id}/submit`, { method: 'POST', body: { submission: submission.value } }); await refresh(); selectedActivity.value = course.value.sections.flatMap((s: any) => s.activities).find((a: any) => a.id === selectedActivity.value.id) }
function addSection() { editingSection.value = null; sectionForm.value = { title: '', description: '' }; showSectionForm.value = true }
// Activity types yang selesai via submit, sisanya selesai saat dilihat
const submitTypes = ['assignment', 'quiz', 'forum']
function isCompleted(activity: any) {
  if (!activity?.progress) return false
  if (activity.type === 'text') return !!activity.progress.completedAt
  if (activity.type === 'link' && activity.linkCompletionRule !== 'view') return !!activity.progress.completedAt
  return submitTypes.includes(activity.type) ? !!activity.progress.submittedAt : !!activity.progress.viewedAt
}
function completionLabel(activity: any) {
  if (activity.type === 'text') return 'selesai dibaca'
  if (activity.type === 'link') return activity.linkCompletionRule === 'view' ? 'diklik' : 'selesai'
  return submitTypes.includes(activity.type) ? 'dikumpulkan' : 'dilihat'
}
function sectionCompleted(section: any) { return (section.activities ?? []).filter((activity: any) => isCompleted(activity)).length }
// Progress keseluruhan course untuk siswa
const allActivities = computed<any[]>(() => (course.value?.sections ?? []).flatMap((s: any) => s.activities ?? []))
const completedCount = computed(() => allActivities.value.filter((a: any) => isCompleted(a)).length)
const progressPercent = computed(() => allActivities.value.length ? Math.round((completedCount.value / allActivities.value.length) * 100) : 0)
async function toggleSection(section: any) { await $fetch(`/api/courses/${id.value}/sections/${section.id}`, { method: 'PATCH', body: { isVisible: !section.isVisible } }); await refresh() }
async function toggleActivity(sectionId: string, activity: any) { await $fetch(`/api/courses/${id.value}/sections/${sectionId}/activities/${activity.id}`, { method: 'PATCH', body: { isVisible: !activity.isVisible } }); await refresh() }
</script>

<template>
  <div class="space-y-5">
    <div v-if="pending" class="h-40 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-700" />
    <div v-else-if="error" class="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-5 text-red-700 dark:text-red-300">Gagal memuat course. <button class="underline" @click="() => refresh()">Coba lagi</button></div>
    <template v-else-if="course">
      <header class="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div v-if="course.coverUrl" class="h-56 w-full overflow-hidden bg-slate-100 dark:bg-slate-700">
          <img :src="course.coverUrl" alt="" class="h-full w-full object-cover">
        </div>
        <div class="p-6">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <h1 class="text-2xl font-bold text-slate-800 dark:text-slate-100">{{ course.name }}</h1>
                <span class="rounded-full bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">{{ course.code || 'Tanpa kode' }}</span>
                <span v-if="canManage" class="rounded-full px-2 py-1 text-xs font-semibold" :class="course.isActive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'">{{ course.isActive ? 'Tampil' : 'Hidden' }}</span>
              </div>
              <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">{{ course.description || 'Belum ada deskripsi.' }}</p>
            </div>

            <!-- Button group (segmented): Absensi selalu tampil; aksi pengelola hanya untuk admin/guru -->
            <div class="inline-flex flex-wrap overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 divide-x divide-slate-200 dark:divide-slate-700">
              <NuxtLink :to="`/dashboard/courses/${id}/attendance`" class="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700">
                <Icon name="heroicons:book-open" class="h-4 w-4" /> Absensi / Logbook
              </NuxtLink>
              <NuxtLink v-if="canManage" :to="`/dashboard/courses/${id}/progress`" class="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700">
                <Icon name="heroicons:chart-bar" class="h-4 w-4" /> Progress
              </NuxtLink>
              <NuxtLink v-if="canManage" :to="`/dashboard/courses/${id}/grades`" class="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700">
                <Icon name="heroicons:scale" class="h-4 w-4" /> Bobot & Nilai
              </NuxtLink>
              <NuxtLink v-if="canManage" :to="`/dashboard/courses/${id}/grading`" class="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700">
                <Icon name="heroicons:clipboard-document-check" class="h-4 w-4" /> Koreksi
              </NuxtLink>
              <button v-if="canManage" type="button" class="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600" @click="editingCourse ? (editingCourse = false) : startCourseEdit()">
                <Icon name="heroicons:pencil-square" class="h-4 w-4" /> {{ editingCourse ? 'Tutup Edit' : 'Edit' }}
              </button>
            </div>
          </div>

          <div class="mt-5 grid gap-4 border-t border-slate-100 dark:border-slate-700 pt-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <div>
              <h3 class="text-xs font-semibold uppercase text-slate-400 dark:text-slate-500">Kategori</h3>
              <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">{{ categoryLabel }}</p>
            </div>
            <div>
              <h3 class="text-xs font-semibold uppercase text-slate-400 dark:text-slate-500">Mata Pelajaran</h3>
              <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">{{ subjectLabel }}</p>
            </div>
            <div>
              <h3 class="text-xs font-semibold uppercase text-slate-400 dark:text-slate-500">Teachers</h3>
              <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">{{ course.teachers?.map((x: any) => x.name).join(', ') || '-' }}</p>
            </div>
            <div>
              <h3 class="text-xs font-semibold uppercase text-slate-400 dark:text-slate-500">Classes</h3>
              <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">{{ summaryClasses }}</p>
            </div>
            <div>
              <h3 class="text-xs font-semibold uppercase text-slate-400 dark:text-slate-500">Jumlah Siswa</h3>
              <p class="mt-1 inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300"><Icon name="heroicons:users" class="h-4 w-4" /> {{ summary.studentCount }} siswa</p>
            </div>
            <div>
              <h3 class="text-xs font-semibold uppercase text-slate-400 dark:text-slate-500">Rata-rata Nilai</h3>
              <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">{{ summary.averageScore != null ? Number(summary.averageScore).toFixed(1) : '-' }}</p>
            </div>
          </div>
        </div>
      </header>

      <!-- Edit course (kategori & mapel bisa diubah) -->
      <section v-if="editingCourse" class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
        <h2 class="font-bold text-slate-800 dark:text-slate-100">Edit Course</h2>
        <div class="mt-3 grid gap-3 lg:grid-cols-2">
          <input v-model="courseForm.name" class="field" placeholder="Nama course">
          <input v-model="courseForm.code" class="field" placeholder="Kode">
          <textarea v-model="courseForm.description" class="field h-24 lg:col-span-2" placeholder="Deskripsi" />
          <div class="lg:col-span-2"><CourseCoverUpload v-model="courseForm.coverUrl" /></div>
          <label class="block">
            <span class="mb-1 block text-xs font-semibold uppercase text-slate-400 dark:text-slate-500">Kategori</span>
            <select v-model="courseForm.categoryId" class="field">
              <option :value="null">Tanpa kategori</option>
              <option v-for="option in categoryOptions" :key="option.id" :value="option.id">{{ option.label }}</option>
            </select>
          </label>
          <label class="block">
            <span class="mb-1 block text-xs font-semibold uppercase text-slate-400 dark:text-slate-500">Mata Pelajaran</span>
            <select v-model="courseForm.subjectId" class="field">
              <option :value="null">Tanpa mapel</option>
              <option v-for="subject in (subjectsData?.data ?? [])" :key="subject.id" :value="subject.id">{{ subject.name }} ({{ subject.code }})</option>
            </select>
          </label>
          <div>
            <p class="mb-1 text-xs font-semibold uppercase text-slate-400 dark:text-slate-500">Kelas peserta</p>
            <div class="flex flex-wrap gap-2">
              <label v-for="cls in (allClasses?.data ?? [])" :key="cls.id" class="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-600 px-2.5 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer" :class="{ 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/30': courseForm.classIds.includes(cls.id) }">
                <input v-model="courseForm.classIds" type="checkbox" :value="cls.id" class="sr-only">
                {{ cls.name }}
              </label>
            </div>
          </div>
          <div>
            <p class="mb-1 text-xs font-semibold uppercase text-slate-400 dark:text-slate-500">Guru pengampu</p>
            <div class="flex flex-wrap gap-2">
              <label v-for="guru in (allTeachers?.data ?? [])" :key="guru.id" class="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-600 px-2.5 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer" :class="{ 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/30': courseForm.teacherIds.includes(guru.id) }">
                <input v-model="courseForm.teacherIds" type="checkbox" :value="guru.id" class="sr-only">
                {{ guru.name }}
              </label>
            </div>
          </div>
        </div>
        <div class="mt-4 flex justify-end gap-2">
          <button class="btn-secondary" @click="editingCourse = false">Batal</button>
          <button class="btn-primary" :disabled="saving" @click="saveCourse">{{ saving ? 'Menyimpan...' : 'Simpan' }}</button>
        </div>
      </section>

      <section v-if="isStudent" class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
          <div class="flex items-center justify-between gap-3">
            <div>
              <h2 class="font-bold text-slate-800 dark:text-slate-100">Progress Course</h2>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ completedCount }} dari {{ allActivities.length }} activity selesai</p>
            </div>
            <strong class="text-2xl text-emerald-600 dark:text-emerald-400">{{ progressPercent }}%</strong>
          </div>
          <div class="mt-3 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700" role="progressbar" :aria-valuenow="progressPercent" aria-valuemin="0" aria-valuemax="100" :aria-label="`Progress course ${progressPercent}%`">
            <div class="h-full rounded-full bg-emerald-500 transition-all duration-500" :style="{ width: `${progressPercent}%` }" />
          </div>
        </section>

        <section v-if="isStudent && myFinalGrade" class="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10 p-5">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="font-bold text-slate-800 dark:text-slate-100">Nilai Akhir</h2>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Dihitung oleh guru berdasarkan bobot aktivitas.</p>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-3xl font-black text-emerald-600 dark:text-emerald-400">{{ Number(myFinalGrade.score).toFixed(0) }}</span>
              <span class="inline-flex items-center rounded-full bg-emerald-500 px-3 py-1 text-sm font-bold text-white">{{ myFinalGrade.grade }}</span>
            </div>
          </div>
          <div v-if="myFinalGradeComponents.length" class="mt-3 flex flex-wrap gap-2">
            <span v-for="(comp, type) in myFinalGradeComponents" :key="type" class="rounded-md bg-white px-2 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {{ type }}: {{ comp.average.toFixed(0) }} <span class="text-slate-400">(bobot {{ comp.weight }}%)</span>
            </span>
          </div>
          <p v-if="myFinalGrade.feedback" class="mt-3 rounded-lg bg-white px-3 py-2 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <span class="font-semibold">Catatan guru: </span>{{ myFinalGrade.feedback }}
          </p>
        </section>

      <!-- Materi -->
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-bold text-slate-800 dark:text-slate-100">Materi</h2>
          <button v-if="canManage" class="btn-primary" @click="addSection">Tambah Section</button>
        </div>
        <section v-for="section in course.sections" :key="section.id" class="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" :class="{ 'opacity-70': canManage && !section.isVisible }">
          <div class="flex cursor-pointer items-center justify-between gap-3 p-5" @click="toggleOpenSection(section.id)">
            <div>
              <h3 class="font-semibold text-slate-800 dark:text-slate-100">{{ section.title }} <span v-if="canManage && !section.isVisible" class="ml-1 rounded-full bg-slate-200 dark:bg-slate-600 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:text-slate-300">Tersembunyi</span></h3>
              <p v-if="section.description" class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ section.description }}</p>
              <span v-if="isStudent && (section.activities?.length ?? 0) > 0" class="mt-1 inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">{{ sectionCompleted(section) }}/{{ section.activities?.length ?? 0 }} selesai</span>
            </div>
            <div class="flex items-center gap-2" @click.stop>
              <button v-if="canManage" class="icon-btn" :title="section.isVisible ? 'Hide section' : 'Show section'" @click="toggleSection(section)"><Icon :name="section.isVisible ? 'heroicons:eye-slash' : 'heroicons:eye'" class="h-4 w-4" /></button>
              <button v-if="canManage" class="icon-btn" title="Edit section" @click="startSectionEdit(section)"><Icon name="heroicons:pencil" class="h-4 w-4" /></button>
              <button v-if="canManage" class="icon-btn" title="Hapus section" @click="deleteSection(section)"><Icon name="heroicons:trash" class="h-4 w-4" /></button>
              <span class="text-slate-400 dark:text-slate-500"><Icon :name="openSections[section.id] ? 'heroicons:chevron-up' : 'heroicons:chevron-down'" class="h-4 w-4" /></span>
            </div>
          </div>
          <div v-if="openSections[section.id]" class="space-y-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30 p-4">
            <article v-for="activity in section.activities" :key="activity.id" class="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-4" :class="{ 'cursor-pointer hover:border-emerald-300': isStudent || canManage, 'opacity-60': canManage && !activity.isVisible }" @click="(isStudent || canManage) && openActivity(activity)">
              <div class="flex items-start justify-between gap-3">
                <div class="flex gap-3">
                  <Icon :name="icons[activity.type] || 'heroicons:document-text'" class="h-5 w-5 shrink-0 text-slate-600 dark:text-slate-300" />
                  <div>
                    <h4 class="font-semibold text-slate-800 dark:text-slate-100">{{ activity.title }} <span v-if="canManage && !activity.isVisible" class="ml-1 rounded-full bg-slate-200 dark:bg-slate-600 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:text-slate-300">Tersembunyi</span><span v-if="canManage && activity.type === 'text' && activity.status === 'draft'" class="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">Draft</span></h4>
                    <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">{{ activity.type === 'text' ? 'Materi Teks' : activity.type }}<span v-if="activity.readingMinutes"> · {{ activity.readingMinutes }} menit baca</span><span v-if="activity.points != null"> · {{ activity.points }} poin</span></p>
                  </div>
                </div>
                <div class="flex items-center gap-2 text-xs" @click.stop>
                  <span v-if="isStudent" class="inline-flex items-center gap-1" :class="isCompleted(activity) ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'">
                    <Icon v-if="isCompleted(activity)" name="heroicons:check" class="h-3.5 w-3.5" />{{ isCompleted(activity) ? `Selesai (${completionLabel(activity)})` : 'Belum selesai' }}
                  </span>
                  <template v-if="canManage">
                    <button class="icon-btn" :title="activity.isVisible ? 'Hide activity' : 'Show activity'" @click="toggleActivity(section.id, activity)"><Icon :name="activity.isVisible ? 'heroicons:eye-slash' : 'heroicons:eye'" class="h-4 w-4" /></button>
                    <NuxtLink v-if="activity.type === 'text'" :to="{ path: `/dashboard/courses/${id}/read/${activity.id}`, query: { preview: '1' } }" class="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300" title="Pratinjau materi"><Icon name="heroicons:eye" class="h-3.5 w-3.5" /> Preview</NuxtLink>
                     <button class="icon-btn" title="Edit activity" @click="startActivity(section.id, activity)"><Icon name="heroicons:pencil" class="h-4 w-4" /></button>
                    <button v-if="activity.type === 'text'" class="icon-btn" title="Duplikat materi" @click="duplicateActivity(section.id, activity)"><Icon name="heroicons:document-duplicate" class="h-4 w-4" /></button>
                    <button class="icon-btn" title="Hapus activity" @click="deleteActivity(section.id, activity)"><Icon name="heroicons:trash" class="h-4 w-4" /></button>
                  </template>
                </div>
              </div>
              <p v-if="canManage && activity.content" class="mt-3 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{{ activity.content }}</p>
            </article>
            <p v-if="!section.activities?.length" class="text-sm text-slate-500 dark:text-slate-400">Belum ada activity.</p>
            <button v-if="canManage" class="w-full rounded-lg border border-dashed border-emerald-300 py-2 text-sm font-semibold text-emerald-600" @click="startActivity(section.id)">+ Tambah Activity</button>
          </div>
        </section>
        <p v-if="!course.sections?.length" class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 text-center text-sm text-slate-500 dark:text-slate-400">Belum ada section.</p>
     <!-- Picker type activity (grid) -->
    <Teleport to="body">
      <div v-if="showActivityPicker" class="modal-bg" @click.self="showActivityPicker = false">
        <div class="modal bg-white dark:bg-slate-800">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h2 class="modal-title text-slate-800 dark:text-slate-100">Tambah Activity</h2>
              <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Pilih jenis activity untuk section ini.</p>
            </div>
            <button class="text-xl text-slate-400 hover:text-slate-600" @click="showActivityPicker = false"><Icon name="heroicons:x-mark" class="h-5 w-5" /></button>
          </div>
          <div class="mt-4 grid gap-2 sm:grid-cols-2">
            <button
              v-for="opt in activityTypeOptions" :key="opt.type" type="button"
              class="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-600 px-3.5 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-emerald-300"
              @click="chooseActivityType(opt.type)"
            >
              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700 text-lg text-slate-600 dark:text-slate-300"><Icon :name="opt.icon" class="h-5 w-5" /></span>
              <span>
                <span class="block text-sm font-semibold text-slate-800 dark:text-slate-100">{{ opt.label }}</span>
                <span class="block text-xs text-slate-400 dark:text-slate-500">{{ opt.desc }}</span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="showSectionForm" class="modal-bg">
        <form class="modal bg-white dark:bg-slate-800" @submit.prevent="saveSection">
          <h2 class="modal-title text-slate-800 dark:text-slate-100">{{ editingSection ? 'Edit Section' : 'Tambah Section' }}</h2>
          <input v-model="sectionForm.title" required class="field mt-4" placeholder="Judul section">
          <textarea v-model="sectionForm.description" class="field mt-3 h-24" placeholder="Deskripsi (opsional)" />
          <div class="modal-actions">
            <button type="button" class="btn-secondary" @click="showSectionForm = false">Batal</button>
            <button class="btn-primary">Simpan</button>
          </div>
        </form>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="selectedActivity" class="modal-bg" :class="selectedActivity.type === 'file' ? 'p-0' : ''" @click.self="selectedActivity = null">
        <div class="modal bg-white dark:bg-slate-800" :class="selectedActivity.type === 'file' ? 'flex h-screen max-h-screen !w-screen !max-w-none flex-col rounded-none p-4 sm:p-6' : 'max-h-[90vh] overflow-y-auto'">
          <div class="flex shrink-0 items-start justify-between">
            <h2 class="modal-title text-slate-800 dark:text-slate-100"><Icon :name="icons[selectedActivity.type] || ''" class="inline h-5 w-5" /> {{ selectedActivity.title }}</h2>
            <button class="text-xl text-slate-400" @click="selectedActivity = null"><Icon name="heroicons:x-mark" class="h-5 w-5" /></button>
          </div>
          <div v-if="selectedActivity.type === 'link'" class="mt-5 space-y-4">
            <p class="whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-300">{{ selectedActivity.content || 'Link eksternal.' }}</p>
            <div class="flex flex-wrap gap-2">
              <a :href="selectedActivity.url" :target="selectedActivity.linkOpenInNewTab === false ? '_self' : '_blank'" rel="noopener noreferrer" class="btn-primary inline-flex items-center gap-2"><Icon name="heroicons:arrow-top-right-on-square" class="h-4 w-4" /> Buka link</a>
              <button v-if="isStudent" class="btn-secondary" :disabled="!!selectedActivity.progress?.completedAt" @click="$fetch(`/api/courses/${id}/activities/${selectedActivity.id}/complete`, { method: 'POST' }).then(() => refresh())">{{ selectedActivity.progress?.completedAt ? 'Selesai' : 'Tandai selesai' }}</button>
            </div>
          </div>
          <div v-if="selectedActivity.type !== 'file' && selectedActivity.type !== 'link'" class="mt-5 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-300">{{ selectedActivity.content || 'Tidak ada konten.' }}</div>
          <div v-if="selectedActivity.type === 'file'" class="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto">
            <template v-for="file in activityAttachments(selectedActivity)" :key="file.url">
              <iframe v-if="isPdfUrl(file.url)" :src="file.url" :title="file.name" class="h-[calc(100vh-9rem)] min-h-[70vh] w-full rounded-lg border border-slate-200 dark:border-slate-600" />
              <a :href="file.url" target="_blank" rel="noopener" class="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-emerald-600 hover:bg-emerald-50 dark:border-slate-600 dark:text-emerald-400 dark:hover:bg-emerald-900/20"><Icon name="heroicons:arrow-top-right-on-square" class="h-4 w-4" />{{ isPdfUrl(file.url) ? 'Buka PDF di tab baru' : `Buka ${file.name}` }}</a>
            </template>
            <a v-if="selectedActivity.url" :href="selectedActivity.url" target="_blank" rel="noopener" class="inline-block font-semibold text-emerald-600 underline">Buka link</a>
          </div>
          <VideoPreview v-else-if="selectedActivity.type === 'video'" :video="videoInfo(selectedActivity)" class="mt-4" />
           <a v-else-if="selectedActivity.type === 'quiz' && selectedActivity.url" :href="selectedActivity.url" target="_blank" rel="noopener" class="mt-4 inline-block font-semibold text-emerald-600 underline">Buka link</a>
          <div v-if="selectedActivity.type === 'forum' || (isStudent && submitTypes.includes(selectedActivity.type))" class="mt-5">
            <label class="text-sm font-semibold text-slate-700 dark:text-slate-300">{{ selectedActivity.type === 'forum' ? 'Pesan / diskusi' : selectedActivity.type === 'quiz' ? 'Jawaban' : 'Submission' }}</label>
            <div v-if="selectedActivity.type === 'forum'" class="mt-3 space-y-3">
              <div v-if="canManage" class="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-800 dark:bg-emerald-900/10">
                <p class="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Tambah Diskusi</p>
                <input v-model="forumTitle" class="field mt-2" placeholder="Judul diskusi">
                <textarea v-model="forumQuestion" class="field mt-2 h-20" placeholder="Pertanyaan diskusi"></textarea>
                <button class="btn-primary mt-2" @click="createDiscussion">Post Diskusi</button>
              </div>
              <div v-if="forumLoading" class="text-xs text-slate-400">Memuat diskusi...</div>
              <div v-if="!forumDiscussions.length" class="rounded-lg bg-amber-50 p-3 text-xs text-amber-700">Belum ada diskusi.</div>
              <div v-for="discussion in forumDiscussions" :key="discussion.id" class="rounded-lg border p-3" :class="forumDiscussionId === discussion.id ? 'border-emerald-400 bg-emerald-50/40' : 'border-slate-200 dark:border-slate-600'" @click="forumDiscussionId = discussion.id">
                <p class="font-semibold text-slate-800 dark:text-slate-100">{{ discussion.title }}</p>
                <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">{{ discussion.question }}</p>
              </div>
              <div v-for="post in forumPosts.filter((item: any) => item.discussionId === forumDiscussionId)" :key="post.id" class="rounded-lg border border-slate-200 p-3 dark:border-slate-600" :class="post.parentId ? 'ml-5' : ''">
                <p class="text-xs font-semibold text-emerald-600">{{ post.authorName }} <span class="font-normal text-slate-400">· {{ new Date(post.createdAt).toLocaleString('id-ID') }}</span></p>
                <p class="mt-1 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{{ post.content }}</p>
                <button class="mt-1 text-xs text-emerald-600 underline" @click="forumReplyTo = post.id">Balas</button>
              </div>
            </div>
            <textarea v-model="submission" class="field mt-2 h-28" :placeholder="forumReplyTo ? 'Tulis balasan' : selectedActivity.type === 'forum' ? 'Tulis komentar atau pertanyaan' : 'Masukkan link atau jawaban'"></textarea>
            <button class="btn-primary mt-3" @click="selectedActivity.type === 'forum' ? submitForumPost() : submitAssignment">{{ selectedActivity.type === 'forum' ? 'Kirim pesan' : 'Submit' }}</button>
          </div>
        </div>
      </div>
    </Teleport>
    </template>
  </div>
</template>

<style scoped>
@reference "~/assets/css/tailwind.css";
.field { @apply w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400; }
.btn-primary { @apply rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50; }
.btn-secondary { @apply rounded-lg border border-slate-200 dark:border-slate-600 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700; }
.icon-btn { @apply rounded-md bg-slate-100 p-1 text-sm text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600; }
.modal-bg { @apply fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4; }
.modal { @apply w-full max-w-lg rounded-xl bg-white dark:bg-slate-800 p-6 shadow-xl; }
.modal-title { @apply text-lg font-bold text-slate-800 dark:text-slate-100; }
.modal-actions { @apply mt-5 flex justify-end gap-2; }
</style>
