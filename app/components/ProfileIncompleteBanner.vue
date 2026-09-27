<!-- ============================================================
  ProfileIncompleteBanner — muncul di dashboard kalau akun
  belum punya data wajib (siswa: NIS/kelas, guru: NIP).
  Tujuan: memberi tahu user & menyarankan melengkapi data.
  ============================================================ -->
<script setup lang="ts">
const { user } = useUserSession()

const dismissed = ref(false)

const profileComplete = computed(
  () => (user.value as { profileComplete?: boolean } | null)?.profileComplete !== false,
)

const role = computed(() => user.value?.role ?? '')

// Saran singkat sesuai role
const saran = computed(() => {
  if (role.value === 'student') return 'Data siswa (NIS dan kelas) belum lengkap.'
  if (role.value === 'teacher') return 'Data guru (NIP) belum lengkap.'
  return 'Data profil Anda belum lengkap.'
})

const show = computed(() => !profileComplete.value && !dismissed.value && (role.value === 'student' || role.value === 'teacher'))
</script>

<template>
  <div
    v-if="show"
    class="mb-4 flex items-start justify-between gap-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3"
  >
    <div class="flex items-start gap-3">
      <Icon name="heroicons:exclamation-triangle" class="h-5 w-5 shrink-0 text-amber-500" />
      <div>
        <p class="text-sm font-semibold text-amber-800 dark:text-amber-300">
          Profil belum lengkap
        </p>
        <p class="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
          {{ saran }} Silakan hubungi admin sekolah untuk melengkapi data Anda.
        </p>
      </div>
    </div>
    <button
      class="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 font-bold shrink-0"
      title="Tutup"
      @click="dismissed = true"
    >
      <Icon name="heroicons:x-mark" class="h-4 w-4" />
    </button>
  </div>
</template>
