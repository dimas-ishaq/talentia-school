<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: ['auth'] })

const { user } = useAuth()
if (user.value?.role === 'student') await navigateTo('/dashboard/courses')
</script>

<template>
  <AdminAttendanceView v-if="user?.role === 'admin' || user?.role === 'teacher'" />
</template>
