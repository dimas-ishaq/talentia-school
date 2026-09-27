<script setup lang="ts">
import { pesanDariError } from '~/composables/useStudents'

// Fetch classes, teachers, categories, subjects
const { data: classesData } = await useFetch<{ data: { id: string; name: string }[] }>('/api/classes')
const { data: teachersData } = await useFetch<{ data: { id: string; name: string }[] }>('/api/teachers')
const { data: categoriesData } = await useFetch<{ data: { id: string; name: string; parentId: string | null; position: number }[] }>('/api/categories')
const { data: subjectsData } = await useFetch<{ data: { id: string; name: string; code: string }[] }>('/api/subjects')

// Build category tree for flat display
const categoryOptions = computed(() => {
  const all = categoriesData.value?.data ?? []
  // Top-level dulu
  const top = all.filter((c) => !c.parentId).sort((a, b) => a.position - b.position)
  const children = all.filter((c) => c.parentId)
  const result: { id: string; label: string; depth: number }[] = []
  for (const t of top) {
    result.push({ id: t.id, label: t.name, depth: 0 })
    // Tambah children
    for (const child of children.filter((c) => c.parentId === t.id).sort((a, b) => a.position - b.position)) {
      result.push({ id: child.id, label: `— ${child.name}`, depth: 1 })
    }
  }
  // Tambah orphan children (parent ga ada di list)
  for (const child of children.filter((c) => !top.find((t) => t.id === c.parentId))) {
    result.push({ id: child.id, label: `— ${child.name} (orphan)`, depth: 1 })
  }
  return result
})

// Form state
const form = reactive({
  name: '',
  code: '',
  description: '',
  coverUrl: '',
  teacherIds: [] as string[],
  classIds: [] as string[],
  categoryId: null as string | null,
  subjectId: null as string | null,
  position: 0,
})

const errors = computed(() => {
  const e: Record<string, string> = {}
  if (!form.name.trim()) e.name = 'Nama course wajib diisi'
  else if (form.name.trim().length > 200) e.name = 'Nama maksimal 200 karakter'
  if (form.code && form.code.length > 50) e.code = 'Kode maksimal 50 karakter'
  if (form.description && form.description.length > 5000) e.description = 'Deskripsi maksimal 5000 karakter'
  return e
})
const isValid = computed(() => Object.keys(errors.value).length === 0)

const isSubmitting = ref(false)
const errorMessage = ref('')

async function handleSubmit() {
  errorMessage.value = ''
  if (!isValid.value) return
  isSubmitting.value = true
  try {
    await $fetch('/api/courses', {
      method: 'POST',
      body: {
        name: form.name.trim(),
        code: form.code.trim() || undefined,
        description: form.description.trim() || undefined,
        coverUrl: form.coverUrl.trim() || undefined,
        teacherIds: form.teacherIds,
        classIds: form.classIds,
        categoryId: form.categoryId || null,
        subjectId: form.subjectId || null,
      },
    })
    await navigateTo('/dashboard/courses')
  } catch (e: unknown) {
    errorMessage.value = pesanDariError(e, 'Gagal menyimpan course')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-5">
    <div class="rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-7 text-white shadow-sm">
      <NuxtLink to="/dashboard/courses" class="text-sm text-emerald-50 hover:text-white">&larr; Kembali ke Course</NuxtLink>
      <div class="mt-5 flex items-end justify-between gap-4">
        <div>
          <p class="text-sm font-semibold uppercase tracking-wider text-emerald-100">Course workspace</p>
          <h1 class="mt-1 text-3xl font-bold">Buat Course Baru</h1>
          <p class="mt-2 max-w-xl text-sm text-emerald-50">Siapkan ruang belajar, pilih mata pelajaran, lalu tentukan guru dan kelas peserta.</p>
        </div>
        <Icon name="heroicons:academic-cap" class="hidden h-20 w-20 text-white/25 sm:block" />
      </div>
    </div>

    <div v-if="errorMessage" class="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-300">{{ errorMessage }}</div>

    <form class="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]" @submit.prevent="handleSubmit">
      <!-- Kolom kiri: info utama -->
      <div class="space-y-5">
        <section class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
          <div class="flex items-center gap-2">
            <Icon name="heroicons:information-circle" class="h-5 w-5 text-emerald-500" />
            <h2 class="font-semibold text-slate-800 dark:text-slate-100">Informasi Dasar</h2>
          </div>
          <div class="mt-4 space-y-4">
            <div>
              <label class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Nama Course <span class="text-red-500">*</span></label>
              <input
                v-model="form.name" type="text" placeholder="Contoh: Matematika Kelas 6"
                class="h-10 w-full rounded-lg border bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500"
                :class="errors.name ? 'border-red-300 dark:border-red-700' : 'border-slate-200 dark:border-slate-600'"
              >
              <p v-if="errors.name" class="mt-1.5 text-xs text-red-600 dark:text-red-400">{{ errors.name }}</p>
            </div>

            <div>
              <label class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Kode (opsional)</label>
              <input v-model="form.code" type="text" placeholder="Contoh: MTK-6" class="h-10 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <p class="mt-1 text-xs text-slate-400 dark:text-slate-500">Kode singkat untuk memudahkan pencarian</p>
            </div>

            <div>
              <label class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Deskripsi (opsional)</label>
              <textarea v-model="form.description" rows="4" placeholder="Jelaskan tentang course ini..." class="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3.5 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>

            <div>
              <label class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">URL Cover (opsional)</label>
              <CourseCoverUpload v-model="form.coverUrl" />
            </div>
          </div>
        </section>

        <section class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
          <div class="flex items-center gap-2">
            <Icon name="heroicons:rectangle-stack" class="h-5 w-5 text-emerald-500" />
            <h2 class="font-semibold text-slate-800 dark:text-slate-100">Klasifikasi</h2>
          </div>
          <div class="mt-4 space-y-4">
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Kategori</label>
                <select v-model="form.categoryId" class="h-10 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option :value="null">Tanpa kategori</option>
                  <option v-for="opt in categoryOptions" :key="opt.id" :value="opt.id">{{ opt.label }}</option>
                </select>
              </div>
              <div>
                <label class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Mata Pelajaran</label>
                <select v-model="form.subjectId" class="h-10 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option :value="null">Tanpa mapel</option>
                  <option v-for="s in subjectsData?.data ?? []" :key="s.id" :value="s.id">{{ s.name }} ({{ s.code }})</option>
                </select>
              </div>
            </div>
          </div>
        </section>
      </div>

      <!-- Kolom kanan: peserta -->
      <div class="space-y-5">
        <section class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <Icon name="heroicons:users" class="h-5 w-5 text-emerald-500" />
              <h2 class="font-semibold text-slate-800 dark:text-slate-100">Guru Pengampu</h2>
            </div>
            <span class="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{{ form.teacherIds.length }} dipilih</span>
          </div>
          <p class="mt-1 text-xs text-slate-400 dark:text-slate-500">Opsional — guru yang mengajar course ini.</p>
          <div class="mt-3 max-h-56 space-y-1 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-600 p-2">
            <label v-for="t in teachersData?.data ?? []" :key="t.id" class="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300">
              <input v-model="form.teacherIds" type="checkbox" :value="t.id" class="rounded border-slate-300 text-emerald-500 focus:ring-emerald-500">
              {{ t.name }}
            </label>
            <p v-if="!teachersData?.data?.length" class="py-1 text-xs text-slate-400 dark:text-slate-500">Belum ada guru terdaftar.</p>
          </div>
        </section>

        <section class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <Icon name="heroicons:building-library" class="h-5 w-5 text-emerald-500" />
              <h2 class="font-semibold text-slate-800 dark:text-slate-100">Kelas Peserta</h2>
            </div>
            <span class="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{{ form.classIds.length }} dipilih</span>
          </div>
          <p class="mt-1 text-xs text-slate-400 dark:text-slate-500">Siswa di kelas terpilih akan otomatis terdaftar.</p>
          <div class="mt-3 max-h-56 space-y-1 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-600 p-2">
            <label v-for="c in classesData?.data ?? []" :key="c.id" class="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300">
              <input v-model="form.classIds" type="checkbox" :value="c.id" class="rounded border-slate-300 text-emerald-500 focus:ring-emerald-500">
              {{ c.name }}
            </label>
            <p v-if="!classesData?.data?.length" class="py-1 text-xs text-slate-400 dark:text-slate-500">Belum ada kelas.</p>
          </div>
        </section>
      </div>

      <!-- Submit -->
      <div class="flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-700 pt-5 lg:col-span-2">
        <NuxtLink to="/dashboard/courses" class="h-10 rounded-lg px-4 text-sm font-medium text-slate-600 dark:text-slate-300 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 leading-10">Batal</NuxtLink>
        <button type="submit" :disabled="isSubmitting || !isValid" class="h-10 rounded-lg bg-emerald-500 px-5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50">
          {{ isSubmitting ? 'Menyimpan...' : 'Simpan Course' }}
        </button>
      </div>
    </form>
  </div>
</template>