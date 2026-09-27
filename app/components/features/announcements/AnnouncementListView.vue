<!-- ============================================================
  AnnouncementListView — daftar + CRUD pengumuman.
  - Logika list/hapus/publish → composables/useAnnouncements.ts
  - Form tambah/edit          → AnnouncementFormModal.vue
  Tombol kelola hanya tampil untuk admin/guru (canManage dari API).
  ============================================================ -->
<script setup lang="ts">
import type { AnnouncementRow } from '~/types/announcement'

const a = useAnnouncements()

const showModal = ref(false)
const editing = ref<AnnouncementRow | null>(null)

const route = useRoute()
const router = useRouter()

// Quick action guru "Buat Pengumuman" mengarah ke ?create=1 → buka modal otomatis.
onMounted(() => {
  if (route.query.create === '1' && a.canManage.value) {
    openCreate()
    router.replace({ query: { ...route.query, create: undefined } })
  }
})

function openCreate() {
  editing.value = null
  showModal.value = true
}

function openEdit(row: AnnouncementRow) {
  editing.value = row
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editing.value = null
}

async function onSaved() {
  const wasEditing = editing.value !== null
  await a.refresh()
  closeModal()
  a.pesanSukses.value = wasEditing ? 'Pengumuman berhasil diupdate.' : 'Pengumuman berhasil ditambahkan.'
}

function formatDate(value: string | Date | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(date)
}

const publishedCount = computed(() => a.announcements.value.filter((x) => x.isPublished).length)
const draftCount = computed(() => a.announcements.value.filter((x) => !x.isPublished).length)
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-6 pb-8">
    <!-- ============ HERO / HEADER ============ -->
    <section class="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-8">
      <div class="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />
      <div class="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div class="max-w-xl">
          <div class="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-400/10 dark:text-emerald-300">
            <Icon name="heroicons:megaphone" class="h-4 w-4" /> Komunikasi
          </div>
          <h1 class="mt-4 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Pengumuman</h1>
          <p class="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">Informasi resmi dari sekolah untuk guru, siswa, dan orang tua.</p>
        </div>
        <button
          v-if="a.canManage.value"
          class="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-600"
          @click="openCreate"
        >
          <Icon name="heroicons:plus" class="h-4 w-4" /> Buat Pengumuman
        </button>
      </div>

      <!-- Ringkasan -->
      <div v-if="a.canManage.value" class="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div
v-for="stat in [
          { label: 'Total', value: a.announcements.value.length, icon: 'heroicons:megaphone', tone: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-400/10 dark:text-emerald-300' },
          { label: 'Terbit', value: publishedCount, icon: 'heroicons:check-badge', tone: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-400/10 dark:text-indigo-300' },
          { label: 'Draft', value: draftCount, icon: 'heroicons:pencil-square', tone: 'text-amber-600 bg-amber-50 dark:bg-amber-400/10 dark:text-amber-300' },
        ]" :key="stat.label" class="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-700 dark:bg-slate-900/30">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-slate-500 dark:text-slate-400">{{ stat.label }}</span>
            <span class="flex h-8 w-8 items-center justify-center rounded-lg" :class="stat.tone">
              <Icon :name="stat.icon" class="h-4 w-4" />
            </span>
          </div>
          <p class="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{{ stat.value }}</p>
        </div>
      </div>
    </section>

    <!-- Toast -->
    <div v-if="a.pesanSukses.value" class="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
      <span class="flex items-center gap-2"><Icon name="heroicons:check-circle" class="h-4 w-4" /> {{ a.pesanSukses.value }}</span>
      <button class="font-bold text-emerald-600 hover:text-emerald-800 dark:text-emerald-400" @click="a.tutupToast()"><Icon name="heroicons:x-mark" class="h-4 w-4" /></button>
    </div>
    <div v-if="a.pesanError.value" class="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
      <span class="flex items-center gap-2"><Icon name="heroicons:exclamation-circle" class="h-4 w-4" /> {{ a.pesanError.value }}</span>
      <button class="font-bold text-red-500 hover:text-red-700 dark:text-red-400" @click="a.tutupToast()"><Icon name="heroicons:x-mark" class="h-4 w-4" /></button>
    </div>

    <!-- Filter status -->
    <div v-if="a.canManage.value && a.announcements.value.length" class="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 text-xs font-medium shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <button
        v-for="opt in [{ v: 'all', l: 'Semua' }, { v: 'published', l: 'Terbit' }, { v: 'draft', l: 'Draft' }] as const"
        :key="opt.v"
        class="rounded-md px-3 py-1.5 transition-colors"
        :class="a.statusFilter.value === opt.v ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'"
        @click="a.statusFilter.value = opt.v"
      >
        {{ opt.l }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="a.pending.value" class="space-y-3">
      <div v-for="i in 3" :key="i" class="h-28 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-700/50" />
    </div>

    <!-- Error -->
    <div v-else-if="a.error.value" class="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
      <Icon name="heroicons:exclamation-triangle" class="h-5 w-5 shrink-0" /> Gagal memuat pengumuman.
    </div>

    <!-- Empty -->
    <div v-else-if="!a.filteredAnnouncements.value.length" class="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-600 dark:bg-slate-800">
      <span class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300">
        <Icon name="heroicons:megaphone" class="h-7 w-7" />
      </span>
      <h2 class="mt-4 font-semibold text-slate-800 dark:text-slate-100">{{ a.announcements.value.length ? 'Tidak ada pengumuman pada filter ini' : 'Belum ada pengumuman' }}</h2>
      <p class="mx-auto mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{{ a.canManage.value ? 'Buat pengumuman pertama untuk dibagikan ke warga sekolah.' : 'Pengumuman akan muncul di sini setelah diterbitkan sekolah.' }}</p>
      <button v-if="a.canManage.value" class="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600" @click="openCreate">
        <Icon name="heroicons:plus" class="h-4 w-4" /> Buat Pengumuman
      </button>
    </div>

    <!-- Daftar -->
    <div v-else class="space-y-4">
      <article
        v-for="row in a.filteredAnnouncements.value"
        :key="row.id"
        class="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-emerald-700 sm:p-6"
      >
        <span v-if="!row.isPublished" class="absolute inset-y-0 left-0 w-1 bg-amber-400" />
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <span
                v-if="a.canManage.value"
                class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                :class="row.isPublished ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300'"
              >
                <Icon :name="row.isPublished ? 'heroicons:check-badge' : 'heroicons:pencil-square'" class="h-3.5 w-3.5" />
                {{ row.isPublished ? 'Terbit' : 'Draft' }}
              </span>
            </div>
            <h2 class="mt-2 font-semibold text-slate-800 dark:text-slate-100">{{ row.title }}</h2>
            <p class="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-slate-400 dark:text-slate-500">
              <span class="inline-flex items-center gap-1"><Icon name="heroicons:user-circle" class="h-3.5 w-3.5" /> {{ row.authorName || 'Sekolah' }}</span>
              <span>·</span>
              <span class="inline-flex items-center gap-1"><Icon name="heroicons:calendar" class="h-3.5 w-3.5" /> {{ formatDate(row.publishedAt || row.createdAt) }}</span>
            </p>
          </div>
        </div>
        <p class="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-600 dark:text-slate-300">{{ row.content }}</p>

        <!-- Aksi (hanya pengelola) -->
        <div v-if="a.canManage.value" class="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-700">
          <button
            class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50"
            :class="row.isPublished ? 'text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700' : 'text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/20'"
            :disabled="a.togglingId.value === row.id"
            @click="a.togglePublish(row)"
          >
            <Icon :name="row.isPublished ? 'heroicons:arrow-uturn-left' : 'heroicons:paper-airplane'" class="h-4 w-4" />
            {{ a.togglingId.value === row.id ? '...' : row.isPublished ? 'Jadikan Draft' : 'Terbitkan' }}
          </button>
          <button class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20" @click="openEdit(row)">
            <Icon name="heroicons:pencil" class="h-4 w-4" /> Edit
          </button>
          <button class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20" @click="a.mintaHapus(row)">
            <Icon name="heroicons:trash" class="h-4 w-4" /> Hapus
          </button>
        </div>
      </article>
    </div>

    <!-- Modal tambah/edit -->
    <AnnouncementFormModal
      v-if="showModal"
      :editing="editing"
      @close="closeModal"
      @saved="onSaved"
    />

    <!-- Modal konfirmasi hapus -->
    <Teleport to="body">
      <div v-if="a.announcementToDelete.value" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" @click.self="a.batalHapus()">
        <div class="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl dark:bg-slate-800">
          <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-xl text-red-600 dark:bg-red-900/30 dark:text-red-400">
            <Icon name="heroicons:trash" class="h-6 w-6" />
          </div>
          <h2 class="font-bold text-slate-800 dark:text-slate-100">Hapus pengumuman ini?</h2>
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
            <b>{{ a.announcementToDelete.value.title }}</b> akan dihapus permanen.
          </p>
          <div class="mt-5 flex gap-2">
            <button class="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700" :disabled="a.isDeleting.value" @click="a.batalHapus()">Batal</button>
            <button class="flex-1 rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-50" :disabled="a.isDeleting.value" @click="a.konfirmasiHapus()">
              {{ a.isDeleting.value ? 'Menghapus...' : 'Ya, Hapus' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
