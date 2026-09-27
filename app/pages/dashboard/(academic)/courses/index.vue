<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: ['auth'] })
const { isAdmin } = useAuth()
const activeTab = ref<'course' | 'kategori'>('course')
</script>

<template>
  <div class="space-y-5">
    <!-- Tab Navigation (Admin Only) -->
    <div v-if="isAdmin" class="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1 shadow-sm">
      <button
        :class="[
          'px-4 py-2 text-sm font-semibold rounded-md transition-colors',
          activeTab === 'course'
            ? 'bg-emerald-500 text-white shadow-sm'
            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
        ]"
        @click="activeTab = 'course'"
      >
        Course
      </button>
      <button
        :class="[
          'px-4 py-2 text-sm font-semibold rounded-md transition-colors',
          activeTab === 'kategori'
            ? 'bg-emerald-500 text-white shadow-sm'
            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
        ]"
        @click="activeTab = 'kategori'"
      >
        Kategori
      </button>
    </div>

    <!-- Content Tabs -->
    <Transition name="fade" mode="out-in">
      <CoursesListView v-if="activeTab === 'course'" :key="'course'" />
      <CourseCategoriesView v-else-if="activeTab === 'kategori'" :key="'kategori'" />
    </Transition>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

