<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth'],
  roles: ['admin', 'teacher', 'student'],
})

const { user } = useAuth()
</script>
<template>
  <AdminScheduleView v-if="user?.role === 'admin'" />
  <TeacherScheduleView v-else-if="user?.role === 'teacher'" />
  <StudentScheduleView v-else-if="user?.role === 'student'" />
</template>
