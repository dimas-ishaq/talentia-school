<!-- app/layouts/dashboard.vue -->
<script setup lang="ts">
const isSidebarOpen = ref(false)
const isSidebarHidden = ref(false)

onMounted(() => {
  isSidebarHidden.value = localStorage.getItem('sidebar-hidden') === 'true'
})

function toggleSidebar() {
  isSidebarHidden.value = !isSidebarHidden.value
  localStorage.setItem('sidebar-hidden', String(isSidebarHidden.value))
}

function openSidebar() {
  isSidebarHidden.value = false
  isSidebarOpen.value = true
}
</script>

<template>
  <div class="min-h-screen bg-background dark:bg-slate-900 flex">
    <!-- Sidebar -->
    <Transition
      enter-active-class="sidebar-shell-enter-active"
      enter-from-class="sidebar-shell-enter-from"
      enter-to-class="sidebar-shell-enter-to"
      leave-active-class="sidebar-shell-leave-active"
      leave-from-class="sidebar-shell-leave-from"
      leave-to-class="sidebar-shell-leave-to"
      appear
    >
      <div v-if="!isSidebarHidden" class="shrink-0">
        <AppSidebar :is-open="isSidebarOpen" @close="isSidebarOpen = false" @toggle="toggleSidebar" />
      </div>
    </Transition>

    <!-- Konten -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- Topbar mobile -->
      <header
        class="appbar sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-card dark:bg-slate-800 border-b border-border dark:border-slate-700"
      >
        <div class="flex items-center gap-2">
          <button
            class="hidden lg:inline-flex p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-slate-700"
            :title="isSidebarHidden ? 'Tampilkan sidebar' : 'Sembunyikan sidebar'"
            @click="toggleSidebar"
          >
            <Icon name="heroicons:bars-3" class="w-6 h-6 dark:text-slate-200" />
          </button>
          <button
            class="p-2 lg:hidden rounded-lg hover:bg-zinc-100 dark:hover:bg-slate-700"
            @click="openSidebar"
          >
            <svg
              class="w-6 h-6 dark:text-slate-200"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>
        <ThemeToggle />
      </header>

      <!-- Page content -->
      <main class="flex-1 p-4 lg:p-6">
        <ProfileIncompleteBanner />
        <slot />
      </main>
    </div>
  </div>
</template>
