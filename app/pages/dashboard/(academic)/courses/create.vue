<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  roles: ['admin', 'teacher'],
})
</script>

<template>
  <CourseCreateView />
</template>