<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: ['auth'] })

const { user } = useAuth()
const { fetch: fetchSession } = useUserSession()
const role = computed(() => user.value?.role ?? '')
const isTeacher = computed(() => role.value === 'teacher')
const isStudent = computed(() => role.value === 'student')
const canEdit = computed(() => isTeacher.value || isStudent.value)

const form = reactive({ name: '', nip: '', nis: '', classId: '' })
const classesList = ref<{ id: string; name: string }[]>([])
const profileComplete = ref<boolean | null>(null)
const saving = ref(false)
const message = ref('')
const errorMessage = ref('')

const { data: meData } = await useFetch('/api/auth/me')
watch(meData, (value: any) => {
  const u = value?.user
  if (!u) return
  form.name = u.name ?? ''
  profileComplete.value = value?.profileComplete ?? true
}, { immediate: true })

if (isStudent.value) {
  const { data } = await useFetch<{ data: { id: string; name: string }[] }>('/api/classes')
  watch(data, (value) => { classesList.value = value?.data ?? [] }, { immediate: true })
}

const missingText = computed(() => {
  if (!canEdit.value) return 'Hanya guru dan siswa yang perlu melengkapi profil di sini.'
  if (profileComplete.value === false) {
    return isStudent.value
      ? 'Data siswa (NIS dan kelas) belum lengkap. Lengkapi di bawah, tanpa perlu hubungi admin.'
      : 'Data guru (NIP) belum lengkap. Lengkapi di bawah, tanpa perlu hubungi admin.'
  }
  return 'Profil Anda sudah lengkap. Anda tetap bisa memperbarui nama di sini.'
})

async function save() {
  message.value = ''
  errorMessage.value = ''
  saving.value = true
  try {
    const body: Record<string, string> = {}
    if (form.name.trim()) body.name = form.name.trim()
    if (isTeacher.value) body.nip = form.nip.trim()
    if (isStudent.value) {
      body.nis = form.nis.trim()
      body.classId = form.classId
    }
    const result = await $fetch<{ success: boolean; profileComplete: boolean }>('/api/auth/profile', { method: 'PATCH', body })
    profileComplete.value = result.profileComplete
    message.value = result.profileComplete ? 'Profil lengkap. Terima kasih.' : 'Tersimpan, tetapi profil masih belum lengkap.'
    await fetchSession()
  } catch (e: any) {
    errorMessage.value = e?.data?.statusMessage || e?.message || 'Gagal menyimpan profil.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-5">
    <div>
      <h1 class="text-xl font-bold text-slate-800 dark:text-slate-100">Profil Saya</h1>
      <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ missingText }}</p>
    </div>

    <div v-if="message" class="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">{{ message }}</div>
    <div v-if="errorMessage" class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">{{ errorMessage }}</div>

    <form v-if="canEdit" class="space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800" @submit.prevent="save">
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300" for="profile-name">Nama</label>
        <input id="profile-name" v-model="form.name" type="text" minlength="2" maxlength="100" class="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-700" placeholder="Nama lengkap">
      </div>
      <div v-if="isTeacher">
        <label class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300" for="profile-nip">NIP</label>
        <input id="profile-nip" v-model="form.nip" type="text" maxlength="30" class="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-700" placeholder="Nomor Induk Pegawai">
      </div>
      <template v-if="isStudent">
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300" for="profile-nis">NIS</label>
          <input id="profile-nis" v-model="form.nis" type="text" maxlength="30" class="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-700" placeholder="Nomor Induk Siswa">
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300" for="profile-class">Kelas</label>
          <select id="profile-class" v-model="form.classId" class="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-700">
            <option value="">Pilih kelas</option>
            <option v-for="c in classesList" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
      </template>
      <button type="submit" :disabled="saving" class="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 hover:bg-emerald-600">
        {{ saving ? 'Menyimpan...' : 'Simpan Profil' }}
      </button>
    </form>

    <div v-else class="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
      Tidak ada data wajib yang perlu dilengkapi untuk peran Anda. Untuk mengubah nama atau kata sandi, hubungi admin sekolah.
    </div>
  </div>
</template>
