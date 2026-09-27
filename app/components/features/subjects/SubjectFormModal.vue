<!-- ============================================================
  SubjectFormModal — form Tambah/Edit mapel dalam 1 modal.
  Mirror dari ClassesFormModal.vue.
  Dibuka via v-if dari AdminSubjectsView, jadi form selalu
  fresh setiap dibuka (tidak perlu reset manual).
  ============================================================ -->
<script setup lang="ts">
import type { SubjectRow, SubjectFormPayload } from '~/types/subjects'
import { pesanDariError } from '~/composables/useStudents'

const props = defineProps<{
  editingSubject: SubjectRow | null // null = mode tambah, ada isi = mode edit
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

// ===== Form state (diisi data lama saat mode edit) =====
const form = reactive({
  code: props.editingSubject?.code ?? '',
  name: props.editingSubject?.name ?? '',
  description: props.editingSubject?.description ?? '',
})

const isEditing = computed(() => props.editingSubject !== null)

// ===== Validasi (cerminan validasi zod di server) =====
const errors = computed(() => {
  const e: Record<string, string> = {}
  if (!form.code.trim()) e.code = 'Kode mapel wajib diisi'
  else if (form.code.trim().length > 10) e.code = 'Kode maksimal 10 karakter'
  if (!form.name.trim()) e.name = 'Nama mapel wajib diisi'
  if (form.description.trim().length > 255) e.description = 'Deskripsi maksimal 255 karakter'
  return e
})

const isValid = computed(() => Object.keys(errors.value).length === 0)

// ===== Submit =====
const isSubmitting = ref(false)
const errorMessage = ref('')

async function handleSubmit() {
  errorMessage.value = ''
  if (!isValid.value) return

  isSubmitting.value = true
  try {
    const body: SubjectFormPayload = {
      code: form.code.trim(),
      name: form.name.trim(),
      description: form.description.trim(),
    }

    if (props.editingSubject) {
      await $fetch(`/api/subjects/${props.editingSubject.id}`, { method: 'PATCH', body })
    } else {
      await $fetch('/api/subjects', { method: 'POST', body })
    }
    emit('saved')
  } catch (e: unknown) {
    errorMessage.value = pesanDariError(e, 'Gagal menyimpan data')
  } finally {
    isSubmitting.value = false
  }
}

const inputClass = 'w-full h-10 px-3.5 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" @click.self="$emit('close')">
      <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md">
        <!-- Header -->
        <div class="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 class="text-lg font-bold text-slate-800 dark:text-slate-100">
            {{ isEditing ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran' }}
          </h2>
          <button class="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors" @click="$emit('close')">
            <Icon name="heroicons:x-mark" class="w-5 h-5" />
          </button>
        </div>

        <!-- Body -->
        <form @submit.prevent="handleSubmit">
          <div class="px-5 py-4 space-y-5">
            <div v-if="errorMessage" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-xs text-red-700 dark:text-red-300">
              {{ errorMessage }}
            </div>

            <!-- Kode -->
            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Kode <span class="text-red-500">*</span>
              </label>
              <input
                v-model="form.code"
                type="text"
                placeholder="Contoh: MTK"
                class="font-mono uppercase bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                :class="[inputClass, errors.code ? 'border-red-300 dark:border-red-700' : 'border-slate-200 dark:border-slate-600']"
              >
              <p v-if="errors.code" class="mt-1.5 text-xs text-red-600 dark:text-red-400">{{ errors.code }}</p>
              <p v-else class="mt-1.5 text-xs text-slate-400 dark:text-slate-500">Singkat & unik, contoh: MTK, IPA, BHS-IND</p>
            </div>

            <!-- Nama -->
            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Nama Mata Pelajaran <span class="text-red-500">*</span>
              </label>
              <input
                v-model="form.name"
                type="text"
                placeholder="Contoh: Matematika"
                class="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                :class="[inputClass, errors.name ? 'border-red-300 dark:border-red-700' : 'border-slate-200 dark:border-slate-600']"
              >
              <p v-if="errors.name" class="mt-1.5 text-xs text-red-600 dark:text-red-400">{{ errors.name }}</p>
            </div>

            <!-- Deskripsi -->
            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Deskripsi</label>
              <textarea
                v-model="form.description"
                rows="2"
                placeholder="Keterangan singkat (opsional)"
                class="w-full px-3.5 py-2.5 text-sm rounded-lg border bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              <p v-if="errors.description" class="mt-1.5 text-xs text-red-600 dark:text-red-400">{{ errors.description }}</p>
            </div>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/80">
            <button type="button" class="h-10 px-4 text-sm font-medium text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" @click="$emit('close')">
              Batal
            </button>
            <button type="submit" :disabled="isSubmitting || !isValid" class="h-10 px-5 text-sm font-semibold text-white rounded-lg bg-emerald-500 hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {{ isSubmitting ? 'Menyimpan...' : isEditing ? 'Update' : 'Simpan' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>
