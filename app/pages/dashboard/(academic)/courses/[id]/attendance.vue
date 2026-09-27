<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: ['auth'] })
const route = useRoute()
const courseId = computed(() => String(route.params.id))
const { returnTo } = useCourseReturn(() => `/dashboard/courses/${route.params.id}`)
const { items: breadcrumbItems } = useCourseBreadcrumb({ courseId, leaf: () => ({ label: 'Kehadiran' }) })
</script>

<template>
  <div class="mx-auto max-w-6xl space-y-5">
    <AppBreadcrumb :back-to="returnTo" :items="breadcrumbItems" />
    <CourseLogbookView :course-id="String($route.params.id)" />
  </div>
</template>
