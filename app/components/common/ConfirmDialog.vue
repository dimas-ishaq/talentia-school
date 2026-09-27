<script setup lang="ts">
const { state, close } = useConfirm()

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') close(false)
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <div v-if="state.open" class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4" role="presentation" @click.self="close(false)">
      <section class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800" role="alertdialog" aria-modal="true" :aria-label="state.title">
        <h2 class="text-lg font-bold text-slate-800 dark:text-slate-100">{{ state.title }}</h2>
        <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">{{ state.message }}</p>
        <div class="mt-6 flex justify-end gap-2">
          <button class="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700" @click="close(false)">{{ state.cancelLabel }}</button>
          <button class="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" :class="state.tone === 'danger' ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600'" @click="close(true)">{{ state.confirmLabel }}</button>
        </div>
      </section>
    </div>
  </Teleport>
</template>
