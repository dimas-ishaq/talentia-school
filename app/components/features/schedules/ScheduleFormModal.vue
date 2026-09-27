<!-- app/components/features/schedules/ScheduleFormModal.vue -->
<script setup lang="ts">
import type { ScheduleRow, ScheduleFormPayload } from '~/types/schedule'
import { pesanDariError } from '~/composables/useStudents'

interface KelasOption {
  id: string
  name: string
  level: number
  isActive: boolean
}

interface MapelOption {
  id: string
  code: string
  name: string
  isActive: boolean
}

interface GuruOption {
  id: string
  name: string
  isActive: boolean
}

const props = defineProps<{
  editing: ScheduleRow | null
  kelas: KelasOption[]
  mapel: MapelOption[]
  guru: GuruOption[]
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const form = reactive({
  dayOfWeek: (props.editing?.dayOfWeek ?? '') as number | '',
  startTime: props.editing?.startTime ?? '',
  endTime: props.editing?.endTime ?? '',
  subjectId: props.editing?.subjectId ?? '',
  classId: props.editing?.classId ?? '',
  teacherId: props.editing?.teacherId ?? '',
  room: props.editing?.room ?? '',
  note: props.editing?.note ?? '',
})

const isEditing = computed(() => props.editing !== null)

const errors = computed(() => {
  const e: Record<string, string> = {}
  if (!form.dayOfWeek) e.dayOfWeek = 'Hari wajib diisi'
  if (!form.startTime) e.startTime = 'Jam mulai wajib diisi'
  else if (!/^\d{2}:\d{2}$/.test(form.startTime)) e.startTime = 'Format jam HH:MM'
  if (!form.endTime) e.endTime = 'Jam selesai wajib diisi'
  else if (!/^\d{2}:\d{2}$/.test(form.endTime)) e.endTime = 'Format jam HH:MM'
  if (form.startTime && form.endTime && form.endTime <= form.startTime)
    e.endTime = 'Jam selesai harus lebih besar dari jam mulai'
  if (!form.subjectId) e.subjectId = 'Mata pelajaran wajib diisi'
  if (!form.classId) e.classId = 'Kelas wajib diisi'
  if (!form.teacherId) e.teacherId = 'Guru wajib diisi'
  if (form.room.length > 50) e.room = 'Ruangan maksimal 50 karakter'
  if (form.note.length > 255) e.note = 'Catatan maksimal 255 karakter'
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
    const body: ScheduleFormPayload = {
      dayOfWeek: Number(form.dayOfWeek),
      startTime: form.startTime,
      endTime: form.endTime,
      subjectId: form.subjectId,
      classId: form.classId,
      teacherId: form.teacherId,
      room: form.room.trim(),
      note: form.note.trim(),
    }

    if (props.editing) {
      await $fetch(`/api/schedules/${props.editing.id}`, { method: 'PATCH', body })
    } else {
      await $fetch('/api/schedules', { method: 'POST', body })
    }
    emit('saved')
  } catch (e: unknown) {
    errorMessage.value = pesanDariError(e, 'Gagal menyimpan jadwal')
  } finally {
    isSubmitting.value = false
  }
}

const selectClass = 'w-full h-10 px-3 text-sm rounded-lg border bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
const inputClass = 'w-full h-10 px-3 text-sm rounded-lg border bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" @click.self="$emit('close')">
      <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <!-- Header -->
        <div class="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 class="text-lg font-bold text-slate-800 dark:text-slate-100">
            {{ isEditing ? 'Edit Jadwal' : 'Tambah Jadwal' }}
          </h2>
          <button class="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors" @click="$emit('close')">
            <Icon name="heroicons:x-mark" class="w-5 h-5" />
          </button>
        </div>

        <form class="flex flex-col min-h-0" @submit.prevent="handleSubmit">
          <div class="px-5 py-4 space-y-4 overflow-y-auto">
            <div v-if="errorMessage" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-xs text-red-700 dark:text-red-300">
              {{ errorMessage }}
            </div>

            <!-- Hari -->
            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Hari <span class="text-red-500">*</span></label>
              <select v-model="form.dayOfWeek" :class="[selectClass, errors.dayOfWeek ? 'border-red-300 dark:border-red-700' : '']">
                <option value="" disabled>Pilih hari</option>
                <option :value="1">Senin</option>
                <option :value="2">Selasa</option>
                <option :value="3">Rabu</option>
                <option :value="4">Kamis</option>
                <option :value="5">Jumat</option>
                <option :value="6">Sabtu</option>
              </select>
              <p v-if="errors.dayOfWeek" class="mt-1 text-xs text-red-600 dark:text-red-400">{{ errors.dayOfWeek }}</p>
            </div>

            <!-- Jam -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Jam Mulai <span class="text-red-500">*</span></label>
                <input v-model="form.startTime" type="time" :class="[inputClass, errors.startTime ? 'border-red-300 dark:border-red-700' : '']">
                <p v-if="errors.startTime" class="mt-1 text-xs text-red-600 dark:text-red-400">{{ errors.startTime }}</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Jam Selesai <span class="text-red-500">*</span></label>
                <input v-model="form.endTime" type="time" :class="[inputClass, errors.endTime ? 'border-red-300 dark:border-red-700' : '']">
                <p v-if="errors.endTime" class="mt-1 text-xs text-red-600 dark:text-red-400">{{ errors.endTime }}</p>
              </div>
            </div>

            <!-- Mapel -->
            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Mata Pelajaran <span class="text-red-500">*</span></label>
              <select v-model="form.subjectId" :class="[selectClass, errors.subjectId ? 'border-red-300 dark:border-red-700' : '']">
                <option value="" disabled>Pilih mapel</option>
                <option v-for="m in mapel" :key="m.id" :value="m.id">{{ m.name }} ({{ m.code }})</option>
              </select>
              <p v-if="errors.subjectId" class="mt-1 text-xs text-red-600 dark:text-red-400">{{ errors.subjectId }}</p>
            </div>

            <!-- Kelas -->
            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Kelas <span class="text-red-500">*</span></label>
              <select v-model="form.classId" :class="[selectClass, errors.classId ? 'border-red-300 dark:border-red-700' : '']">
                <option value="" disabled>Pilih kelas</option>
                <option v-for="k in kelas" :key="k.id" :value="k.id">{{ k.name }}</option>
              </select>
              <p v-if="errors.classId" class="mt-1 text-xs text-red-600 dark:text-red-400">{{ errors.classId }}</p>
            </div>

            <!-- Guru -->
            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Guru <span class="text-red-500">*</span></label>
              <select v-model="form.teacherId" :class="[selectClass, errors.teacherId ? 'border-red-300 dark:border-red-700' : '']">
                <option value="" disabled>Pilih guru</option>
                <option v-for="g in guru" :key="g.id" :value="g.id">{{ g.name }}</option>
              </select>
              <p v-if="errors.teacherId" class="mt-1 text-xs text-red-600 dark:text-red-400">{{ errors.teacherId }}</p>
            </div>

            <!-- Ruangan -->
            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Ruangan <span class="text-slate-400 dark:text-slate-500 font-normal">(opsional)</span></label>
              <input v-model="form.room" type="text" placeholder="Contoh: Lab IPA" :class="[inputClass, errors.room ? 'border-red-300 dark:border-red-700' : '']">
              <p v-if="errors.room" class="mt-1 text-xs text-red-600 dark:text-red-400">{{ errors.room }}</p>
            </div>

            <!-- Catatan -->
            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Catatan <span class="text-slate-400 dark:text-slate-500 font-normal">(opsional)</span></label>
              <textarea v-model="form.note" rows="2" placeholder="Keterangan tambahan" class="w-full px-3 py-2 text-sm rounded-lg border bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
              <p v-if="errors.note" class="mt-1 text-xs text-red-600 dark:text-red-400">{{ errors.note }}</p>
            </div>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/80">
            <button type="button" class="h-10 px-4 text-sm font-medium text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" @click="$emit('close')">Batal</button>
            <button type="submit" :disabled="isSubmitting || !isValid" class="h-10 px-5 text-sm font-semibold text-white rounded-lg bg-emerald-500 hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {{ isSubmitting ? 'Menyimpan...' : isEditing ? 'Update' : 'Simpan' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

