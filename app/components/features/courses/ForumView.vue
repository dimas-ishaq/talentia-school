<script setup lang="ts">
const route = useRoute()
const courseId = computed(() => String(route.params.id))
const activityId = computed(() => String(route.params.activityId))
const { isAdmin, isTeacher, user } = useAuth()
const canManage = computed(() => isAdmin.value || isTeacher.value)
const { data: courseData } = await useFetch<any>(() => `/api/courses/${courseId.value}`, { key: `forum-course-${courseId.value}` })
const activity = computed(() => courseData.value?.data?.sections?.flatMap((s: any) => s.activities ?? []).find((item: any) => item.id === activityId.value))
const discussions = ref<any[]>([])
const posts = ref<any[]>([])
const selectedDiscussionId = ref('')
const replyTo = ref<string | null>(null)
const message = ref('')
const title = ref('')
const question = ref('')
const pending = ref(true)
const saving = ref(false)
const errorMessage = ref('')
const editingDiscussion = ref<any>(null)
const editingPost = ref<any>(null)
const { confirm } = useConfirm()

async function load() {
  pending.value = true
  try {
    const result = await $fetch<any>(`/api/courses/${courseId.value}/activities/${activityId.value}/discussions`)
    discussions.value = result.data.discussions ?? []
    posts.value = result.data.posts ?? []
    if (!discussions.value.some((item) => item.id === selectedDiscussionId.value)) selectedDiscussionId.value = discussions.value[0]?.id ?? ''
  } catch (error: any) { errorMessage.value = error?.data?.statusMessage || 'Gagal memuat forum' } finally { pending.value = false }
}
await load()
const selectedDiscussion = computed(() => discussions.value.find((item) => item.id === selectedDiscussionId.value))
const selectedPosts = computed(() => posts.value.filter((item) => item.discussionId === selectedDiscussionId.value))

function resetDiscussionForm() { editingDiscussion.value = null; title.value = ''; question.value = '' }
function editDiscussion(discussion: any) { editingDiscussion.value = discussion; title.value = discussion.title; question.value = discussion.question }
async function saveDiscussion() {
  if (!title.value.trim() || !question.value.trim()) return
  saving.value = true; errorMessage.value = ''
  try {
    const base = `/api/courses/${courseId.value}/activities/${activityId.value}/discussions`
    await $fetch(editingDiscussion.value ? `${base}/${editingDiscussion.value.id}` : base, { method: editingDiscussion.value ? 'PATCH' : 'POST', body: { title: title.value, question: question.value } })
    resetDiscussionForm(); await load()
  } catch (error: any) { errorMessage.value = error?.data?.statusMessage || 'Gagal menyimpan diskusi' } finally { saving.value = false }
}
async function deleteDiscussion(discussion: any) {
  if (!await confirm({ title: 'Hapus diskusi?', message: `Hapus diskusi "${discussion.title}" beserta semua tanggapan?`, confirmLabel: 'Ya, hapus', tone: 'danger' })) return
  saving.value = true
  try { await $fetch(`/api/courses/${courseId.value}/activities/${activityId.value}/discussions/${discussion.id}`, { method: 'DELETE' }); await load() } catch (error: any) { errorMessage.value = error?.data?.statusMessage || 'Gagal menghapus diskusi' } finally { saving.value = false }
}
function editPost(post: any) { editingPost.value = post; message.value = post.content }
function cancelPostEdit() { editingPost.value = null; message.value = '' }
async function savePost() {
  if (!message.value.trim()) return
  saving.value = true; errorMessage.value = ''
  try {
    if (editingPost.value) await $fetch(`/api/courses/${courseId.value}/activities/${activityId.value}/forum/${editingPost.value.id}`, { method: 'PATCH', body: { content: message.value } })
    else await $fetch(`/api/courses/${courseId.value}/activities/${activityId.value}/forum`, { method: 'POST', body: { content: message.value, discussionId: selectedDiscussionId.value, parentId: replyTo.value } })
    cancelPostEdit(); replyTo.value = null; await load()
  } catch (error: any) { errorMessage.value = error?.data?.statusMessage || 'Gagal menyimpan tanggapan' } finally { saving.value = false }
}
async function deletePost(post: any) {
  if (!await confirm({ title: 'Hapus tanggapan?', message: 'Hapus tanggapan ini?', confirmLabel: 'Ya, hapus', tone: 'danger' })) return
  saving.value = true
  try { await $fetch(`/api/courses/${courseId.value}/activities/${activityId.value}/forum/${post.id}`, { method: 'DELETE' }); await load() } catch (error: any) { errorMessage.value = error?.data?.statusMessage || 'Gagal menghapus tanggapan' } finally { saving.value = false }
}
</script>

<template>
  <div class="mx-auto max-w-6xl space-y-5">
    <NuxtLink :to="`/dashboard/courses/${courseId}`" class="text-sm text-slate-500">&larr; Kembali ke course</NuxtLink>
    <header><p class="text-xs font-semibold uppercase tracking-wide text-emerald-600">Forum diskusi</p><h1 class="mt-1 text-2xl font-bold text-slate-800 dark:text-slate-100">{{ activity?.title || 'Forum' }}</h1><p class="mt-1 text-sm text-slate-500">Diskusikan topik, baca tanggapan, dan balas kontribusi peserta.</p></header>
    <p v-if="errorMessage" class="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20">{{ errorMessage }}</p>
    <div class="grid gap-5 lg:grid-cols-[280px_1fr]">
      <aside class="card h-fit">
        <div class="flex items-center justify-between"><h2 class="font-semibold">Diskusi</h2><span class="text-xs text-slate-400">{{ discussions.length }}</span></div>
        <div v-if="pending" class="mt-4 space-y-2"><div v-for="i in 3" :key="i" class="h-14 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-700" /></div>
        <div v-else-if="!discussions.length" class="mt-4 text-sm text-slate-500">Belum ada topik diskusi.</div>
        <div v-else class="mt-4 space-y-2"><div v-for="discussion in discussions" :key="discussion.id" class="rounded-lg border p-3" :class="selectedDiscussionId === discussion.id ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20' : 'border-slate-200 dark:border-slate-700'"><button class="w-full text-left" @click="selectedDiscussionId = discussion.id"><p class="font-medium text-slate-800 dark:text-slate-100">{{ discussion.title }}</p><p class="mt-1 line-clamp-2 text-xs text-slate-500">{{ discussion.question }}</p></button><div v-if="canManage" class="mt-2 flex gap-3 text-xs"><button class="text-emerald-600" @click="editDiscussion(discussion)">Edit</button><button class="text-red-600" @click="deleteDiscussion(discussion)">Hapus</button></div></div></div>
        <form v-if="canManage" class="mt-5 border-t border-slate-200 pt-4 dark:border-slate-700" @submit.prevent="saveDiscussion"><h3 class="text-sm font-semibold">{{ editingDiscussion ? 'Edit diskusi' : 'Buat topik baru' }}</h3><input v-model="title" class="field mt-2" placeholder="Judul topik" required><textarea v-model="question" class="field mt-2 h-20" placeholder="Pertanyaan diskusi" required /><div class="mt-2 flex gap-2"><button class="btn flex-1" :disabled="saving">{{ editingDiscussion ? 'Simpan' : 'Buat diskusi' }}</button><button v-if="editingDiscussion" type="button" class="btn-secondary" @click="resetDiscussionForm">Batal</button></div></form>
      </aside>
      <main class="card min-h-[420px]">
        <div v-if="!selectedDiscussion" class="flex min-h-[360px] items-center justify-center text-center text-sm text-slate-500">Pilih diskusi untuk melihat percakapan.</div>
        <template v-else><div class="border-b border-slate-200 pb-4 dark:border-slate-700"><h2 class="text-xl font-bold text-slate-800 dark:text-slate-100">{{ selectedDiscussion.title }}</h2><p class="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">{{ selectedDiscussion.question }}</p></div><div class="space-y-4 py-5"><div v-if="!selectedPosts.length" class="text-sm text-slate-500">Belum ada tanggapan. Jadilah yang pertama berdiskusi.</div><article v-for="post in selectedPosts" :key="post.id" class="rounded-lg border border-slate-200 p-4 dark:border-slate-700" :class="post.parentId ? 'ml-6' : ''"><p class="text-xs font-semibold text-emerald-600">{{ post.authorName }} <span class="font-normal text-slate-400">· {{ new Date(post.createdAt).toLocaleString('id-ID') }}</span></p><p class="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-200">{{ post.content }}</p><div class="mt-2 flex gap-3 text-xs"><button class="font-semibold text-emerald-600 hover:underline" @click="replyTo = post.id">Balas</button><button v-if="post.userId === user?.id || canManage" class="text-emerald-600" @click="editPost(post)">Edit</button><button v-if="post.userId === user?.id || canManage" class="text-red-600" @click="deletePost(post)">Hapus</button></div></article></div><form class="border-t border-slate-200 pt-4 dark:border-slate-700" @submit.prevent="savePost"><textarea v-model="message" class="field h-24" :placeholder="editingPost ? 'Edit tanggapan...' : replyTo ? 'Tulis balasan...' : 'Tulis tanggapan...'" required /><div class="mt-2 flex justify-end gap-2"><button v-if="replyTo || editingPost" type="button" class="btn-secondary" @click="editingPost ? cancelPostEdit() : replyTo = null">Batal</button><button class="btn" :disabled="saving">{{ saving ? 'Menyimpan...' : editingPost ? 'Simpan perubahan' : 'Kirim tanggapan' }}</button></div></form></template>
      </main>
    </div>
  </div>
</template>

<style scoped>
@reference "~/assets/css/tailwind.css";
.card { @apply rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800; }
.field { @apply w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200; }
.btn { @apply rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50; }
.btn-secondary { @apply rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 dark:border-slate-600 dark:text-slate-300; }
</style>
