<script setup lang="ts">
interface Props {
  isOpen?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isOpen: true,
})

const emit = defineEmits<{
  close: []
  toggle: []
}>()

const route = useRoute()
const { menus } = useMenu()

const search = ref('')
const openSections = ref<string[]>([])

// Auto-expand section yang berisi route aktif
watchEffect(() => {
  for (const group of menus.value) {
    if (!group.title) continue
    const hasActive = group.items.some(item => route.path.startsWith(item.to))
    if (hasActive && !openSections.value.includes(group.title)) {
      openSections.value.push(group.title)
    }
  }
})

// Persist open sections
onMounted(() => {
  const saved = localStorage.getItem('sidebar-sections')
  if (saved) {
    try { openSections.value = JSON.parse(saved) } catch {}
  }
})

watch(openSections, (val) => {
  localStorage.setItem('sidebar-sections', JSON.stringify(val))
}, { deep: true })

// Filter berdasarkan search
const filteredGroups = computed(() => {
  if (!search.value) return menus.value
  const q = search.value.toLowerCase()
  return menus.value
    .map(group => ({
      ...group,
      items: group.items.filter(item =>
        item.label.toLowerCase().includes(q)
      ),
    }))
    .filter(group => group.items.length > 0)
})

function toggleSection(title: string) {
  const idx = openSections.value.indexOf(title)
  if (idx >= 0) openSections.value.splice(idx, 1)
  else openSections.value.push(title)
}

function isActive(path: string) {
  return route.path === path || route.path.startsWith(path + '/')
}

function isIconifyName(icon: string) {
  return icon.includes(':')
}
</script>

<template>
  <!-- Backdrop mobile -->
  <Transition name="overlay">
    <div
      v-if="isOpen"
      class="fixed inset-0 bg-black/50 z-40 lg:hidden"
      @click="emit('close')"
    />
  </Transition>

  <!-- Sidebar -->
  <aside
    :class="[
      'fixed lg:sticky top-0 left-0 z-50 lg:z-0',
      'appbar h-screen w-64 bg-card dark:bg-slate-800 border-r border-border dark:border-slate-700',
      'flex flex-col transform-gpu transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform',
      isOpen ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 lg:translate-x-0 lg:opacity-100',
    ]"
  >
    <!-- Logo -->
    <div class="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
      <div class="flex items-center gap-3">
        <NuxtLink to="/dashboard" class="flex shrink-0 items-center gap-2 whitespace-nowrap" aria-label="Dashboard Talentia School">
          <Icon name="heroicons:academic-cap" class="h-6 w-6 shrink-0 text-emerald-600" />
          <span class="text-base font-bold text-emerald-600">Talentia School</span>
        </NuxtLink>
        <NuxtLink to="/" class="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-emerald-600 dark:hover:bg-slate-700 dark:hover:text-emerald-400" aria-label="Halaman utama" title="Halaman utama">
          <Icon name="heroicons:home" class="h-4 w-4" />
        </NuxtLink>
      </div>
      <button
        class="lg:hidden p-1 rounded hover:bg-zinc-100 dark:hover:bg-slate-700"
        @click="emit('close')"
      >
        <Icon name="heroicons:x-mark" class="w-5 h-5 dark:text-slate-300" />
      </button>
      <button
        class="hidden lg:inline-flex p-1 rounded hover:bg-zinc-100 dark:hover:bg-slate-700"
        title="Sembunyikan sidebar"
        @click="emit('toggle')"
      >
        <Icon name="heroicons:chevron-double-left" class="w-5 h-5 dark:text-slate-300" />
      </button>
    </div>

    <!-- Search -->
    <div class="p-3 border-b border-slate-100 dark:border-slate-700">
      <div class="relative">
        <Icon name="heroicons:magnifying-glass" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-4 h-4" />
        <input
          v-model="search"
          type="text"
          placeholder="Cari menu..."
          class="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600
                 bg-card dark:bg-slate-800 text-slate-800 dark:text-slate-200
                 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent
                 placeholder:text-slate-400 dark:placeholder:text-slate-500"
        >
      </div>
    </div>

    <!-- Menu -->
    <nav class="flex-1 overflow-y-auto p-3 space-y-1">
      <div v-for="(group, i) in filteredGroups" :key="i">
        <!-- Section header (collapsible) -->
        <button
          v-if="group.title"
          class="w-full flex items-center justify-between px-3 py-2 mt-2
                 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider
                 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          @click="toggleSection(group.title)"
        >
          <span>{{ group.title }}</span>
          <svg
            :class="{ 'rotate-90': openSections.includes(group.title!) || search }"
            class="w-3 h-3 transition-transform"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M7 5l5 5-5 5V5z" />
          </svg>
        </button>

        <!-- Items -->
        <div
          v-show="!group.title || openSections.includes(group.title!) || search"
          class="space-y-0.5"
        >
          <NuxtLink
            v-for="item in group.items"
            :key="item.to"
            :to="item.to"
            :class="[
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
              isActive(item.to)
                ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-semibold'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white',
            ]"
            @click="emit('close')"
          >
            <Icon v-if="isIconifyName(item.icon)" :name="item.icon" class="w-5 h-5 shrink-0" />
            <span v-else class="w-5 h-5 shrink-0 flex items-center justify-center text-base leading-none">{{ item.icon }}</span>
            <span class="flex-1 truncate">{{ item.label }}</span>
            <span
              v-if="item.badge"
              class="px-1.5 py-0.5 text-xs font-semibold rounded-full
                     bg-red-500 text-white min-w-[20px] text-center"
            >
              {{ item.badge }}
            </span>
          </NuxtLink>
        </div>
      </div>

      <!-- Empty state -->
      <div
        v-if="filteredGroups.length === 0"
        class="text-center py-8 text-sm text-slate-400 dark:text-slate-500"
      >
        Menu tidak ditemukan
      </div>
    </nav>

    <!-- User footer -->
    <div class="p-3 border-t border-slate-200 dark:border-slate-700">
      <UserMenu />
    </div>
  </aside>
</template>

<style scoped>
.overlay-enter-active,
.overlay-leave-active {
  transition: opacity 0.3s ease;
}
.overlay-enter-from,
.overlay-leave-to {
  opacity: 0;
}
</style>