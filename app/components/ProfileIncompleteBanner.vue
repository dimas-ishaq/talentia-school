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
        <div class="min-w-0">
          <p class="text-sm font-semibold text-amber-800 dark:text-amber-300">
            Profil belum lengkap
          </p>
          <p class="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
            {{ saran }} Lengkapi sekarang di halaman profil.
          </p>
          <NuxtLink
            to="/dashboard/profile"
            class="mt-2 inline-flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600"
          >
            <Icon name="heroicons:pencil-square" class="h-3.5 w-3.5" /> Lengkapi profil
          </NuxtLink>
        </div>
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
