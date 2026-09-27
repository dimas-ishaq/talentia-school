<script setup lang="ts">
const colorMode = useColorMode()
const mode = computed(() => colorMode.value)

function toggle() {
  colorMode.preference = mode.value === 'dark' ? 'light' : 'dark'
}
</script>

<template>
  <ClientOnly>
    <button
      class="relative w-9 h-9 flex items-center justify-center rounded-lg
             text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700
             transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
      :title="mode === 'dark' ? 'Mode Terang' : 'Mode Gelap'"
      @click="toggle"
    >
      <Icon
        name="heroicons:sun"
        class="w-5 h-5 absolute inset-0 m-auto transition-all duration-200"
        :class="mode === 'dark' ? 'opacity-0 scale-0 rotate-90' : 'opacity-100 scale-100 rotate-0'"
      />
      <Icon
        name="heroicons:moon"
        class="w-5 h-5 absolute inset-0 m-auto transition-all duration-200"
        :class="mode === 'dark' ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-0 -rotate-90'"
      />
    </button>
  </ClientOnly>
</template>