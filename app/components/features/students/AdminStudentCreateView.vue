<!-- ============================================================
  AdminStudentCreateView — halaman TAMBAH siswa.
  Sekarang TIPIS: form-nya numpang ke StudentForm.vue,
  di sini hanya urus "kirim ke API + pindah halaman".
  ============================================================ -->
<script setup lang="ts">
import type { StudentFormData } from './StudentForm.vue'
import { pesanDariError } from '~/composables/useStudents'

const isSubmitting = ref(false)
const errorMessage = ref('')

async function handleSubmit(data: StudentFormData) {
  errorMessage.value = ''
  isSubmitting.value = true
  try {
    await $fetch('/api/students', {
      method: 'POST',
      body: {
        name: data.name,
        email: data.email,
        password: data.password,
        nis: data.nis,
        classId: data.classId,
        gender: data.gender,
        birthDate: data.birthDate,
        phone: data.phone.trim(),
        address: data.address.trim(),
      },
    })
    // ?created=1 dibaca oleh useStudents() untuk menampilkan toast sukses
    await navigateTo('/dashboard/students?created=1')
  } catch (e: unknown) {
    errorMessage.value = pesanDariError(e, 'Gagal menyimpan data siswa')
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
        <h1 class="text-2xl font-bold text-slate-800 dark:text-slate-100">Tambah Siswa</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400">Akun login akan dibuat otomatis</p>
      </div>
    </div>

    <StudentForm
      :is-submitting="isSubmitting"
      :error-message="errorMessage"
      submit-label="Simpan Siswa"
      @submit="handleSubmit"
      @cancel="handleCancel"
    />
  </div>
</template>
