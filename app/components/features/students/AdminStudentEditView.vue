<!-- ============================================================
  AdminStudentEditView — halaman UBAH siswa.
  BARU: sebelumnya tombol "Edit" mengarah ke halaman yang
  tidak ada (404). Sekarang memakai StudentForm yang sama
  dengan halaman Create, jadi tampilannya konsisten.
  ============================================================ -->
<script setup lang="ts">
import type { StudentFormData } from './StudentForm.vue'
import { pesanDariError } from '~/composables/useStudents'

const route = useRoute()
const id = route.params.id as string

// Ambil data lama untuk mengisi form
const { data, pending, error, refresh } = await useFetch<{ data: Record<string, string | null> }>(`/api/students/${id}`)

const initial = computed(() => {
  const d = data.value?.data
  if (!d) return undefined
  return {
    name: (d.name as string) ?? '',
    nis: (d.nis as string) ?? '',
    classId: (d.classId as string) ?? '',
    gender: ((d.gender as string) || '') as '' | 'L' | 'P',
    birthDate: (d.birthDate as string) ?? '',
    phone: (d.phone as string) ?? '',
    address: (d.address as string) ?? '',
  }
})

const parentId = computed(() => (data.value?.data?.parentId as string | null) ?? null)
const parentSearch = ref('')
const { data: parentsData, refresh: refreshParents } = await useFetch<{ data: { id: string; name: string }[] }>(() => `/api/users?role=parent&perPage=100&search=${encodeURIComponent(parentSearch.value)}`, { watch: [parentSearch] })
const parents = computed(() => parentsData.value?.data ?? [])
const parentForm = reactive({ parentId: '' as string })
watch(parentId, (v) => { parentForm.parentId = v ?? '' }, { immediate: true })
const parentSaving = ref(false)
const parentMessage = ref('')
const parentError = ref('')

async function saveParent() {
  parentError.value = ''
  parentMessage.value = ''
  parentSaving.value = true
  try {
    await $fetch(`/api/students/${id}/parent`, { method: 'PATCH', body: { parentId: parentForm.parentId || null } })
    parentMessage.value = parentForm.parentId ? 'Orang tua terhubung.' : 'Tautan orang tua dilepas.'
    await refresh()
  } catch (e: unknown) {
    parentError.value = pesanDariError(e, 'Gagal menyimpan tautan orang tua')
  } finally {
    parentSaving.value = false
  }
}

const isSubmitting = ref(false)
const errorMessage = ref('')

async function handleSubmit(form: StudentFormData) {
  errorMessage.value = ''
  isSubmitting.value = true
  try {
    await $fetch(`/api/students/${id}`, {
      method: 'PATCH',
      body: {
        name: form.name,
        nis: form.nis,
        classId: form.classId,
        gender: form.gender,
        birthDate: form.birthDate,
        phone: form.phone.trim(),
        address: form.address.trim(),
      },
    })
    // ?updated=1 dibaca oleh useStudents() untuk menampilkan toast sukses
    await navigateTo('/dashboard/students?updated=1')
  } catch (e: unknown) {
    errorMessage.value = pesanDariError(e, 'Gagal mengupdate data siswa')
  } finally {
    isSubmitting.value = false
  }
}

function handleCancel() {
  navigateTo('/dashboard/students')
}
</script>

<template>
  <div class="max-w-3xl mx-auto space-y-5">
    <div class="flex items-center gap-3">
      <NuxtLink to="/dashboard/students" class="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400"><Icon name="heroicons:arrow-left" class="h-4 w-4" /></NuxtLink>
      <div>
        <h1 class="text-2xl font-bold text-slate-800 dark:text-slate-100">Edit Siswa</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400">Ubah data siswa (email & password tidak diubah di sini)</p>
      </div>
    </div>

    <div v-if="pending" class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
      <div class="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
      <p class="mt-3 text-sm text-slate-500 dark:text-slate-400">Memuat data...</p>
    </div>

    <div v-else-if="error || !data?.data" class="bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 p-6 text-center">
      <p class="text-red-600 dark:text-red-400 font-medium">Siswa tidak ditemukan</p>
      <div class="mt-3 flex items-center justify-center gap-2">
        <button class="text-sm text-red-600 dark:text-red-400 hover:underline" @click="refresh()">Coba lagi</button>
        <NuxtLink to="/dashboard/students" class="text-sm text-slate-600 dark:text-slate-300 hover:underline">Kembali</NuxtLink>
      </div>
    </div>

    <template v-else>
      <StudentForm
        :initial="initial"
        :show-account="false"
        :is-submitting="isSubmitting"
        :error-message="errorMessage"
        submit-label="Simpan Perubahan"
        @submit="handleSubmit"
        @cancel="handleCancel"
      />
      <section class="max-w-3xl rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
        <h2 class="font-semibold text-slate-800 dark:text-slate-100">Hubungkan orang tua</h2>
        <p class="mt-1 text-sm text-slate-500">Pilih akun orang tua untuk menampilkan dashboard anak.</p>
        <div class="mt-4 flex gap-2">
          <input v-model="parentSearch" class="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 px-3 text-sm dark:border-slate-600 dark:bg-slate-900" placeholder="Cari nama/email" />
          <select v-model="parentForm.parentId" class="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 px-3 text-sm dark:border-slate-600 dark:bg-slate-900">
            <option value="">Tidak terhubung</option>
            <option v-for="parent in parents" :key="parent.id" :value="parent.id">{{ parent.name }}</option>
          </select>
          <button class="rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white disabled:opacity-50" :disabled="parentSaving" @click="saveParent">Simpan</button>
        </div>
        <p v-if="parentMessage" class="mt-2 text-sm text-emerald-600">{{ parentMessage }}</p>
        <p v-if="parentError" class="mt-2 text-sm text-red-600">{{ parentError }}</p>
      </section>
    </template>
  </div>
</template>
