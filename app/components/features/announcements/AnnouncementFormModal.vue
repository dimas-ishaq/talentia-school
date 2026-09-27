<!-- ============================================================
  AnnouncementFormModal — form Tambah/Edit pengumuman (1 modal).
  Mengikuti pola SubjectFormModal: dibuka via v-if dari view,
  jadi form selalu fresh tiap dibuka.
  Validasi di sini mencerminkan zod di shared/schemas/announcement.ts.
  ============================================================ -->
<script setup lang="ts">
import type { AnnouncementRow, AnnouncementFormPayload } from '~/types/announcement'
import { pesanDariError } from '~/composables/useStudents'

const props = defineProps<{
  editing: AnnouncementRow | null // null = tambah, ada isi = edit
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const form = reactive({
  title: props.editing?.title ?? '',
  content: props.editing?.content ?? '',
  isPublished: props.editing?.isPublished ?? false,
})

const isEditing = computed(() => props.editing !== null)

const errors = computed(() => {
  const e: Record<string, string> = {}
  if (!form.title.trim()) e.title = 'Judul wajib diisi'
  else if (form.title.trim().length < 3) e.title = 'Judul minimal 3 karakter'
  else if (form.title.trim().length > 150) e.title = 'Judul maksimal 150 karakter'
  if (!form.content.trim()) e.content = 'Isi pengumuman wajib diisi'
  else if (form.content.trim().length < 3) e.content = 'Isi pengumuman minimal 3 karakter'
  else if (form.content.trim().length > 5000) e.content = 'Isi pengumuman maksimal 5000 karakter'
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
    const body: AnnouncementFormPayload = {
      title: form.title.trim(),
      content: form.content.trim(),
      isPublished: form.isPublished,
    }
    if (props.editing) {
      await $fetch(`/api/announcements/${props.editing.id}`, { method: 'PATCH', body })
    } else {
      await $fetch('/api/announcements', { method: 'POST', body })
    }
    emit('saved')
  } catch (e: unknown) {
    errorMessage.value = pesanDariError(e, 'Gagal menyimpan pengumuman')
  } finally {
    isSubmitting.value = false
  }
}

const inputClass = 'w-full h-11 px-3.5 text-sm rounded-xl border focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200'
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" @click.self="emit('close')">
      <div class="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-slate-800">
        <!-- Header -->
        <div class="flex items-center gap-3 border-b border-slate-100 px-6 py-5 dark:border-slate-700">
          <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300">
            <Icon :name="isEditing ? 'heroicons:pencil-square' : 'heroicons:megaphone'" class="h-5 w-5" />
          </span>
          <div class="flex-1">
            <h2 class="font-bold text-slate-800 dark:text-slate-100">{{ isEditing ? 'Edit Pengumuman' : 'Buat Pengumuman' }}</h2>
            <p class="text-xs text-slate-500 dark:text-slate-400">Informasi resmi untuk warga sekolah.</p>
          </div>
          <button class="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-700" @click="emit('close')">
            <Icon name="heroicons:x-mark" class="h-5 w-5" />
          </button>
        </div>

        <form @submit.prevent="handleSubmit">
          <div class="space-y-4 px-6 py-5">
            <p v-if="errorMessage" class="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
              <Icon name="heroicons:exclamation-circle" class="h-4 w-4 shrink-0" /> {{ errorMessage }}
            </p>

            <!-- Judul -->
            <div>
              <label class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Judul <span class="text-red-500">*</span></label>
              <input
                v-model="form.title"
                type="text"
                placeholder="Contoh: Jadwal UTS Semester Ganjil"
                :class="[inputClass, errors.title ? 'border-red-300 dark:border-red-700' : 'border-slate-200 dark:border-slate-600']"
              >
              <p v-if="errors.title" class="mt-1.5 text-xs text-red-600 dark:text-red-400">{{ errors.title }}</p>
            </div>

            <!-- Isi -->
            <div>
              <label class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Isi Pengumuman <span class="text-red-500">*</span></label>
              <textarea
                v-model="form.content"
                rows="6"
                placeholder="Tulis isi pengumuman di sini..."
                class="w-full rounded-xl border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                :class="errors.content ? 'border-red-300 dark:border-red-700' : 'border-slate-200 dark:border-slate-600'"
              />
              <div class="mt-1.5 flex items-center justify-between">
                <p v-if="errors.content" class="text-xs text-red-600 dark:text-red-400">{{ errors.content }}</p>
                <span v-else class="text-xs text-slate-400 dark:text-slate-500">Mendukung teks multi-baris.</span>
                <span class="text-xs text-slate-400 dark:text-slate-500">{{ form.content.length }}/5000</span>
              </div>
            </div>

            <!-- Publikasi -->
            <label class="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-600">
              <input v-model="form.isPublished" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500">
              <span class="flex-1">
                <span class="block text-sm font-medium text-slate-700 dark:text-slate-200">Langsung terbitkan</span>
                <span class="block text-xs text-slate-500 dark:text-slate-400">Jika tidak dicentang, pengumuman disimpan sebagai draft.</span>
              </span>
            </label>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-6 py-4 dark:border-slate-700 dark:bg-slate-800/80">
            <button type="button" class="h-10 rounded-xl px-4 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700" @click="emit('close')">
              Batal
            </button>
            <button type="submit" :disabled="isSubmitting || !isValid" class="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-500 px-5 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50">
              <Icon v-if="isSubmitting" name="heroicons:arrow-path" class="h-4 w-4 animate-spin" />
              {{ isSubmitting ? 'Menyimpan...' : isEditing ? 'Update' : 'Simpan' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>
