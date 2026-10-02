<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: ['auth'] })

const { user, isAdmin, isTeacher, isStudent } = useAuth()
</script>

<template>
  <StudentAttendanceView v-if="isStudent" />
  <AdminAttendanceView v-else-if="isAdmin || isTeacher" />
</template>
