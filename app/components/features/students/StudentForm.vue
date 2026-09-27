<!-- ============================================================
  StudentForm — SATU form dipakai oleh Create DAN Edit.
  Pemula: tambah/kurangi field cukup di file ini saja,
  tidak perlu ubah 2 file (create + edit) terpisah.
  ============================================================ -->
<script setup lang="ts">
export interface StudentFormData {
  name: string
  nis: string
  classId: string
  gender: '' | 'L' | 'P'
  birthDate: string
  phone: string
  address: string
  // Khusus Create: email & password ikut diisi. Edit: disembunyikan.
  email: string
  password: string
}

const props = withDefaults(defineProps<{
  initial?: Partial<StudentFormData>
  isSubmitting?: boolean
  errorMessage?: string
  showAccount?: boolean // true = tampilkan email+password (Create), false = sembunyikan (Edit)
  submitLabel?: string
}>(), {
  initial: () => ({}),
  isSubmitting: false,
  errorMessage: '',
  showAccount: true,
  submitLabel: 'Simpan Siswa',
})

const emit = defineEmits<{
  (e: 'submit', data: StudentFormData): void
  (e: 'cancel'): void
}>()

// ----- Daftar kelas untuk dropdown -----
const { data: classesData } = await useFetch('/api/classes')
const classes = computed(() => (classesData.value as { data?: { id: string; name: string }[] } | null)?.data ?? [])

// ----- State form (diisi dari `initial` saat mode Edit) -----
const form = reactive<StudentFormData>({
  name: props.initial.name ?? '',
  nis: props.initial.nis ?? '',
  classId: props.initial.classId ?? '',
  gender: (props.initial.gender as StudentFormData['gender']) ?? '',
  birthDate: props.initial.birthDate ?? '',
  phone: props.initial.phone ?? '',
  address: props.initial.address ?? '',
  email: props.initial.email ?? '',
  password: '',
})

// Kalau data Edit datang terlambat (fetch async), sinkronkan ulang
watch(() => props.initial, (val) => {
  if (!val) return
  if (val.name !== undefined) form.name = val.name
  if (val.nis !== undefined) form.nis = val.nis
  if (val.classId !== undefined) form.classId = val.classId
  if (val.gender !== undefined) form.gender = val.gender as StudentFormData['gender']
  if (val.birthDate !== undefined) form.birthDate = val.birthDate ?? ''
  if (val.phone !== undefined) form.phone = val.phone ?? ''
  if (val.address !== undefined) form.address = val.address ?? ''
  if (val.email !== undefined) form.email = val.email ?? ''
}, { deep: true })

const showPassword = ref(false)

// Auto-fill email & password dari NIS (hanya saat Create)
watch(() => form.nis, (nis) => {
  if (!props.showAccount || !nis) return
  if (!form.email) form.email = `${nis}@siswa.sekolah.id`
  if (!form.password) form.password = nis
})

// ----- Validasi sederhana (cerminan validasi server) -----
const errors = computed(() => {
  const e: Record<string, string> = {}
  if (!form.name.trim()) e.name = 'Nama wajib diisi'
  if (!form.nis.trim()) e.nis = 'NIS wajib diisi'
  if (!form.classId) e.classId = 'Kelas wajib dipilih'
  if (!form.gender) e.gender = 'Gender wajib dipilih'
  if (props.showAccount) {
    if (!form.email.trim()) e.email = 'Email wajib diisi'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Format email tidak valid'
    if (!form.password) e.password = 'Password wajib diisi'
    else if (form.password.length < 6) e.password = 'Password minimal 6 karakter'
  }
  return e
})
const isValid = computed(() => Object.keys(errors.value).length === 0)

function handleSubmit() {
  if (!isValid.value) return
  emit('submit', { ...form, name: form.name.trim(), nis: form.nis.trim(), email: form.email.trim() })
}

// Style input dipakai ulang supaya konsisten
const inputClass = 'w-full h-10 px-3.5 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200'
</script>

<template>
  <form class="space-y-5" @submit.prevent="handleSubmit">
    <div v-if="errorMessage" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-300">
      {{ errorMessage }}
    </div>

    <!-- ===== Data Akun (hanya Create) ===== -->
    <div v-if="showAccount" class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-5">
      <h2 class="font-semibold text-slate-800 dark:text-slate-100 pb-3 border-b border-slate-100 dark:border-slate-700">Data Akun</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Nama Lengkap <span class="text-red-500">*</span></label>
          <input v-model="form.name" type="text" placeholder="Ahmad Fauzi" class="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200" :class="[inputClass, errors.name ? 'border-red-300 dark:border-red-700' : 'border-slate-200 dark:border-slate-600']">
          <p v-if="errors.name" class="mt-1.5 text-xs text-red-600 dark:text-red-400">{{ errors.name }}</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">NIS <span class="text-red-500">*</span></label>
          <input v-model="form.nis" type="text" placeholder="2024001" class="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200" :class="[inputClass, 'font-mono', errors.nis ? 'border-red-300 dark:border-red-700' : 'border-slate-200 dark:border-slate-600']">
          <p v-if="errors.nis" class="mt-1.5 text-xs text-red-600 dark:text-red-400">{{ errors.nis }}</p>
        </div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Email <span class="text-red-500">*</span></label>
          <input v-model="form.email" type="email" placeholder="nama@siswa.sekolah.id" class="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200" :class="[inputClass, errors.email ? 'border-red-300 dark:border-red-700' : 'border-slate-200 dark:border-slate-600']">
          <p v-if="errors.email" class="mt-1.5 text-xs text-red-600 dark:text-red-400">{{ errors.email }}</p>
          <p v-else class="mt-1.5 text-xs text-slate-400 dark:text-slate-500">Otomatis dari NIS</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Password <span class="text-red-500">*</span></label>
          <div class="relative">
            <input v-model="form.password" :type="showPassword ? 'text' : 'password'" placeholder="Minimal 6 karakter" class="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200" :class="[inputClass, 'pr-11', errors.password ? 'border-red-300 dark:border-red-700' : 'border-slate-200 dark:border-slate-600']">
            <button type="button" class="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 inline-flex items-center justify-center rounded-md text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700" @click="showPassword = !showPassword">
              <Icon :name="showPassword ? 'heroicons:eye-slash' : 'heroicons:eye'" class="w-4 h-4" />
            </button>
          </div>
          <p v-if="errors.password" class="mt-1.5 text-xs text-red-600 dark:text-red-400">{{ errors.password }}</p>
          <p v-else class="mt-1.5 text-xs text-slate-400 dark:text-slate-500">Default: sama dengan NIS</p>
        </div>
      </div>
    </div>

    <!-- ===== Data Siswa (dipakai Create + Edit) ===== -->
    <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-5">
      <h2 class="font-semibold text-slate-800 dark:text-slate-100 pb-3 border-b border-slate-100 dark:border-slate-700">Data Siswa</h2>

      <!-- Saat Edit, nama & NIS tetap bisa diubah di sini -->
      <div v-if="!showAccount" class="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Nama Lengkap <span class="text-red-500">*</span></label>
          <input v-model="form.name" type="text" class="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200" :class="[inputClass, errors.name ? 'border-red-300 dark:border-red-700' : 'border-slate-200 dark:border-slate-600']">
          <p v-if="errors.name" class="mt-1.5 text-xs text-red-600 dark:text-red-400">{{ errors.name }}</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">NIS <span class="text-red-500">*</span></label>
          <input v-model="form.nis" type="text" class="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200" :class="[inputClass, 'font-mono', errors.nis ? 'border-red-300 dark:border-red-700' : 'border-slate-200 dark:border-slate-600']">
          <p v-if="errors.nis" class="mt-1.5 text-xs text-red-600 dark:text-red-400">{{ errors.nis }}</p>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Kelas <span class="text-red-500">*</span></label>
          <select v-model="form.classId" class="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200" :class="[inputClass, errors.classId ? 'border-red-300 dark:border-red-700' : 'border-slate-200 dark:border-slate-600']">
            <option value="">Pilih kelas</option>
            <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
          <p v-if="errors.classId" class="mt-1.5 text-xs text-red-600 dark:text-red-400">{{ errors.classId }}</p>
          <p v-else-if="classes.length === 0" class="mt-1.5 text-xs text-amber-600 dark:text-amber-400">Belum ada kelas</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Tanggal Lahir</label>
          <input v-model="form.birthDate" type="date" class="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200" :class="[inputClass, 'border-slate-200 dark:border-slate-600']">
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Jenis Kelamin <span class="text-red-500">*</span></label>
        <div class="grid grid-cols-2 gap-3">
          <label class="flex items-center justify-center gap-2 h-10 px-3 text-sm rounded-lg border cursor-pointer transition-colors" :class="form.gender === 'L' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-medium' : 'border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'">
            <input v-model="form.gender" type="radio" value="L" class="sr-only"> Laki-laki
          </label>
          <label class="flex items-center justify-center gap-2 h-10 px-3 text-sm rounded-lg border cursor-pointer transition-colors" :class="form.gender === 'P' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-medium' : 'border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'">
            <input v-model="form.gender" type="radio" value="P" class="sr-only"> Perempuan
          </label>
        </div>
        <p v-if="errors.gender" class="mt-1.5 text-xs text-red-600 dark:text-red-400">{{ errors.gender }}</p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">No. HP</label>
          <input v-model="form.phone" type="tel" placeholder="08xxxxxxxxxx" class="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200" :class="[inputClass, 'border-slate-200 dark:border-slate-600']">
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Alamat</label>
          <input v-model="form.address" type="text" placeholder="Alamat lengkap" class="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200" :class="[inputClass, 'border-slate-200 dark:border-slate-600']">
        </div>
      </div>
    </div>

    <div class="flex items-center justify-end gap-2">
      <button type="button" class="h-10 px-4 text-sm font-medium text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700" :disabled="isSubmitting" @click="emit('cancel')">
        Batal
      </button>
      <button type="submit" :disabled="isSubmitting || !isValid" class="h-10 px-5 text-sm font-semibold text-white rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed">
        {{ isSubmitting ? 'Menyimpan...' : submitLabel }}
      </button>
    </div>
  </form>
</template>
