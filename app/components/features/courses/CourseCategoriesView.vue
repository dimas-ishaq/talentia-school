<script setup lang="ts">
import type { CategoryRow } from '~/types/categories'

const c = useCategories()
const { confirm } = useConfirm()
const showForm = ref(false)
const editing = ref<CategoryRow | null>(null)
const form = reactive({ name: '', parentId: null as string | null, position: 0 })
const saving = ref(false)
const formError = ref('')
const draggedCategory = ref<CategoryRow | null>(null)

function startCategoryDrag(category: CategoryRow) {
  draggedCategory.value = category
}

async function dropCategory(target: CategoryRow) {
  const source = draggedCategory.value
  draggedCategory.value = null
  if (!source || source.id === target.id || source.parentId !== target.parentId) return

  const siblings = c.categories.value
    .filter((category) => category.parentId === source.parentId)
    .sort((a, b) => a.position - b.position)
  const from = siblings.findIndex((category) => category.id === source.id)
  const to = siblings.findIndex((category) => category.id === target.id)
  if (from < 0 || to < 0) return
  const [moved] = siblings.splice(from, 1)
  siblings.splice(to, 0, moved!)
  await c.saveOrder(siblings)
}

const flatCategories = computed(() => c.categories.value.filter((x) => x.id !== editing.value?.id))
const courses = ref<any[]>([])
const coursesByCategory = computed(() => {
  const map: Record<string, any[]> = {}
  for (const course of courses.value) {
    const key = course.categoryId || '__none__'
    ;(map[key] ??= []).push(course)
  }
  for (const list of Object.values(map)) list.sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || String(a.name).localeCompare(String(b.name)))
  return map
})

async function loadCourses() {
  try { courses.value = (await $fetch<{ data: any[] }>('/api/courses')).data ?? [] } catch { courses.value = [] }
}

async function reorderCourse(course: any, dir: 'up' | 'down') {
  const siblings = [...(coursesByCategory.value[course.categoryId || '__none__'] ?? [])]
  const index = siblings.findIndex((x) => x.id === course.id)
  const neighbor = dir === 'up' ? siblings[index - 1] : siblings[index + 1]
  if (!neighbor) return
  await $fetch(`/api/courses/${course.id}`, { method: 'PATCH', body: { position: neighbor.position } })
  await $fetch(`/api/courses/${neighbor.id}`, { method: 'PATCH', body: { position: course.position } })
  await loadCourses()
}

async function deleteCourse(course: any) {
  if (!await confirm({ title: 'Hapus course?', message: `Hapus course "${course.name}"?`, confirmLabel: 'Ya, hapus', tone: 'danger' })) return
  await $fetch(`/api/courses/${course.id}`, { method: 'DELETE' })
  await loadCourses()
}

onMounted(loadCourses)

function openCreate(parentId: string | null = null) {
  editing.value = null
  form.name = ''
  form.parentId = parentId
  form.position = 0
  formError.value = ''
  showForm.value = true
}

function openEdit(category: CategoryRow) {
  editing.value = category
  form.name = category.name
  form.parentId = category.parentId
  form.position = category.position
  formError.value = ''
  showForm.value = true
}

function closeForm() { showForm.value = false; editing.value = null }

async function save() {
  formError.value = ''
  if (!form.name.trim()) { formError.value = 'Nama kategori wajib diisi'; return }
  if (form.parentId === editing.value?.id) { formError.value = 'Kategori tidak boleh menjadi induknya sendiri'; return }
  saving.value = true
  try {
    const body = { name: form.name.trim(), parentId: form.parentId, position: Number(form.position) || 0 }
    if (editing.value) await $fetch(`/api/categories/${editing.value.id}`, { method: 'PATCH', body })
    else await $fetch('/api/categories', { method: 'POST', body })
    await c.refresh()
    c.pesanSukses.value = editing.value ? 'Kategori berhasil diubah.' : 'Kategori berhasil ditambahkan.'
    closeForm()
  } catch (e: any) {
    formError.value = e?.data?.statusMessage || e?.statusMessage || 'Gagal menyimpan kategori'
  } finally { saving.value = false }
}

</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-slate-800 dark:text-slate-100">Kategori Course</h1>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Atur kategori bertingkat dan urutan course.</p>
      </div>
      <button class="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600" @click="openCreate()">+ Tambah Kategori</button>
    </div>

    <div v-if="c.pesanSukses.value" class="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{{ c.pesanSukses.value }}</div>
    <div v-if="c.pesanError.value" class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{{ c.pesanError.value }}</div>

    <div v-if="c.pending.value" class="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Memuat kategori...</div>
    <div v-else-if="!c.tree.value.length && !(coursesByCategory['__none__'] ?? []).length" class="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Belum ada kategori.</div>
    <template v-else>
      <div v-if="c.tree.value.length" class="space-y-2">
        <template v-for="root in c.tree.value" :key="root.id">
          <div
            class="group rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
            :class="draggedCategory?.id === root.id ? 'opacity-50' : ''"
            draggable="true"
            @dragstart="startCategoryDrag(root)"
            @dragover.prevent
            @drop.prevent="dropCategory(root)"
          >
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div class="flex items-center gap-3">
                <Icon name="heroicons:bars-3" class="h-4 w-4 cursor-grab text-slate-300 group-hover:text-slate-400 dark:text-slate-600" title="Geser untuk mengubah urutan" />
                <span class="font-semibold text-slate-800 dark:text-slate-100">{{ root.name }}</span>
                <span class="rounded-full px-2 py-0.5 text-xs" :class="root.isVisible ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'">{{ root.isVisible ? 'Tampil' : 'Hidden' }}</span>
              </div>
              <div class="flex gap-1">
                <button class="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100" title="Naik" @click="c.reorder(root, 'up')"><Icon name="heroicons:arrow-up" class="h-3.5 w-3.5" /></button>
                <button class="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100" title="Turun" @click="c.reorder(root, 'down')"><Icon name="heroicons:arrow-down" class="h-3.5 w-3.5" /></button>
                <button class="rounded px-2 py-1 text-xs text-emerald-600 hover:bg-emerald-50" @click="openCreate(root.id)">+ Sub</button>
                <button class="rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50" @click="openEdit(root)">Edit</button>
                <button class="rounded px-2 py-1 text-xs text-amber-600 hover:bg-amber-50" @click="c.toggleVisible(root)">{{ root.isVisible ? 'Hide' : 'Show' }}</button>
                <button class="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50" @click="c.mintaHapus(root)">Hapus</button>
              </div>
            </div>
            <div v-if="root.children.length" class="mt-3 space-y-2 border-l-2 border-slate-100 pl-4">
              <template v-for="child in root.children" :key="child.id">
                <div
                  class="group flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-700/50"
                  :class="draggedCategory?.id === child.id ? 'opacity-50' : ''"
                  draggable="true"
                  @dragstart.stop="startCategoryDrag(child)"
                  @dragover.prevent
                  @drop.stop.prevent="dropCategory(child)"
                >
                  <div class="flex items-center gap-2"><Icon name="heroicons:bars-3" class="h-3.5 w-3.5 cursor-grab text-slate-300 group-hover:text-slate-400 dark:text-slate-600" title="Geser untuk mengubah urutan" /><span class="text-sm text-slate-700 dark:text-slate-200">{{ child.name }}</span><span class="rounded-full px-2 py-0.5 text-[10px]" :class="child.isVisible ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'">{{ child.isVisible ? 'Tampil' : 'Hidden' }}</span></div>
                  <div class="flex gap-1"><button class="px-2 text-xs text-slate-500" @click="c.reorder(child, 'up')"><Icon name="heroicons:arrow-up" class="h-3.5 w-3.5" /></button><button class="px-2 text-xs text-slate-500" @click="c.reorder(child, 'down')"><Icon name="heroicons:arrow-down" class="h-3.5 w-3.5" /></button><button class="px-2 text-xs text-blue-600" @click="openEdit(child)">Edit</button><button class="px-2 text-xs text-amber-600" @click="c.toggleVisible(child)">{{ child.isVisible ? 'Hide' : 'Show' }}</button><button class="px-2 text-xs text-red-600" @click="c.mintaHapus(child)">Hapus</button></div>
                </div>
                <div v-for="course in coursesByCategory[child.id] ?? []" :key="course.id" class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-800">
                  <div class="flex items-center gap-2"><NuxtLink :to="`/dashboard/courses/${course.id}`" class="text-sm text-slate-700 hover:text-emerald-600 dark:text-slate-200">{{ course.name }}</NuxtLink></div>
                  <div class="flex gap-1"><button class="px-2 text-xs text-slate-500" title="Naik" @click="reorderCourse(course, 'up')"><Icon name="heroicons:arrow-up" class="h-3.5 w-3.5" /></button><button class="px-2 text-xs text-slate-500" title="Turun" @click="reorderCourse(course, 'down')"><Icon name="heroicons:arrow-down" class="h-3.5 w-3.5" /></button><button class="px-2 text-xs text-red-600" title="Hapus course" @click="deleteCourse(course)"><Icon name="heroicons:trash" class="h-3.5 w-3.5" /></button></div>
                </div>
              </template>
            </div>
            <div v-if="(coursesByCategory[root.id] ?? []).length" class="mt-3 space-y-2 border-l-2 border-slate-100 pl-4">
              <div v-for="course in coursesByCategory[root.id]" :key="course.id" class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-800">
                <div class="flex items-center gap-2"><NuxtLink :to="`/dashboard/courses/${course.id}`" class="text-sm text-slate-700 hover:text-emerald-600 dark:text-slate-200">{{ course.name }}</NuxtLink></div>
                <div class="flex gap-1"><button class="px-2 text-xs text-slate-500" title="Naik" @click="reorderCourse(course, 'up')"><Icon name="heroicons:arrow-up" class="h-3.5 w-3.5" /></button><button class="px-2 text-xs text-slate-500" title="Turun" @click="reorderCourse(course, 'down')"><Icon name="heroicons:arrow-down" class="h-3.5 w-3.5" /></button><button class="px-2 text-xs text-red-600" title="Hapus course" @click="deleteCourse(course)"><Icon name="heroicons:trash" class="h-3.5 w-3.5" /></button></div>
              </div>
            </div>
          </div>
        </template>
      </div>

      <div v-if="(coursesByCategory['__none__'] ?? []).length" class="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <div class="flex items-center gap-3">
          <span class="font-semibold text-slate-800 dark:text-slate-100">Tanpa Kategori</span>
        </div>
        <div class="mt-3 space-y-2 border-l-2 border-slate-100 pl-4">
          <div v-for="course in coursesByCategory['__none__']" :key="course.id" class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-800">
            <div class="flex items-center gap-2"><NuxtLink :to="`/dashboard/courses/${course.id}`" class="text-sm text-slate-700 hover:text-emerald-600 dark:text-slate-200">{{ course.name }}</NuxtLink></div>
            <div class="flex gap-1"><button class="px-2 text-xs text-slate-500" title="Naik" @click="reorderCourse(course, 'up')"><Icon name="heroicons:arrow-up" class="h-3.5 w-3.5" /></button><button class="px-2 text-xs text-slate-500" title="Turun" @click="reorderCourse(course, 'down')"><Icon name="heroicons:arrow-down" class="h-3.5 w-3.5" /></button><button class="px-2 text-xs text-red-600" title="Hapus course" @click="deleteCourse(course)"><Icon name="heroicons:trash" class="h-3.5 w-3.5" /></button></div>
          </div>
        </div>
      </div>
    </template>

    <Teleport to="body">
      <div v-if="showForm" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="closeForm">
        <form class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" @submit.prevent="save">
          <h2 class="text-lg font-bold text-slate-800">{{ editing ? 'Edit Kategori' : 'Tambah Kategori' }}</h2>
          <p v-if="formError" class="mt-3 rounded-lg bg-red-50 p-2 text-sm text-red-600">{{ formError }}</p>
          <label class="mt-4 block text-sm font-medium text-slate-700">Nama</label>
          <input v-model="form.name" class="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" required>
          <label class="mt-4 block text-sm font-medium text-slate-700">Induk</label>
          <select v-model="form.parentId" class="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"><option :value="null">Tanpa induk</option><option v-for="parent in flatCategories" :key="parent.id" :value="parent.id">{{ parent.name }}</option></select>
          <div class="mt-5 flex justify-end gap-2"><button type="button" class="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100" @click="closeForm">Batal</button><button class="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" :disabled="saving">{{ saving ? 'Menyimpan...' : 'Simpan' }}</button></div>
        </form>
      </div>
      <div v-if="c.dihapus.value" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="c.batalHapus"><div class="w-full max-w-sm rounded-xl bg-white p-6"><h2 class="font-bold text-slate-800">Hapus kategori?</h2><p class="mt-2 text-sm text-slate-500">{{ c.dihapus.value.name }} dihapus. Course menjadi tanpa kategori.</p><div class="mt-5 flex justify-end gap-2"><button class="rounded-lg px-4 py-2 text-sm" @click="c.batalHapus">Batal</button><button class="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white" :disabled="c.isDeleting.value" @click="c.konfirmasiHapus">Hapus</button></div></div></div>
    </Teleport>
  </div>
</template>
