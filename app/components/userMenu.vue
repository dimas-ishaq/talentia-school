<script setup lang="ts">
const { user, logout } = useAuth()

const isOpen = ref(false)

const roleLabel = computed(() => {
  const map: Record<string, string> = {
    admin: 'Owner Sekolah',
    org_admin: 'Admin Sekolah',
    owner: 'Owner Sekolah',
    teacher: 'Guru',
    student: 'Siswa',
    parent: 'Orang Tua',
  }
  return map[user.value?.role ?? ''] ?? 'User'
})

const initials = computed(() => {
  const name = user.value?.name ?? 'U'
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
})
</script>

<template>
  <div class="relative">
    <button
      class="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
      @click="isOpen = !isOpen"
    >
      <div
class="w-9 h-9 rounded-full bg-emerald-500 text-white
                  flex items-center justify-center font-semibold text-sm">
        {{ initials }}
      </div>
      <div class="flex-1 text-left min-w-0">
        <p class="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
          {{ user?.name }}
        </p>
        <p class="text-xs text-slate-500 dark:text-slate-400">{{ roleLabel }}</p>
      </div>
      <svg class="w-4 h-4 text-slate-400 dark:text-slate-500" fill="currentColor" viewBox="0 0 20 20">
        <path d="M5.5 7l4.5 4.5L14.5 7z" />
      </svg>
    </button>

    <!-- Dropdown -->
    <Transition name="dropdown">
      <div
        v-if="isOpen"
        class="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-slate-800
               rounded-lg shadow-lg dark:shadow-2xl border border-slate-200 dark:border-slate-700 py-1 z-10"
      >
        <NuxtLink
          to="/dashboard/profile"
          class="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
          @click="isOpen = false"
        >
          <Icon name="heroicons:user" class="w-4 h-4" /> Profil Saya
        </NuxtLink>
        <NuxtLink
          to="/dashboard/settings"
          class="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
          @click="isOpen = false"
        >
          <Icon name="heroicons:cog-6-tooth" class="w-4 h-4" /> Pengaturan
        </NuxtLink>
        <hr class="my-1 border-slate-100 dark:border-slate-700">
        <button
          class="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
          @click="logout"
        >
          <Icon name="heroicons:arrow-right-on-rectangle" class="w-4 h-4" /> Keluar
        </button>
      </div>
    </Transition>

    <!-- Click outside -->
    <div
      v-if="isOpen"
      class="fixed inset-0 z-0"
      @click="isOpen = false"
    />
  </div>
</template>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.15s, transform 0.15s;
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>