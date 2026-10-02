<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth'],
  roles: ['admin', 'org_admin', 'owner', 'teacher', 'student'],
})

const { isAdmin, isTeacher, isStudent } = useAuth()
</script>
<template>
  <AdminScheduleView v-if="isAdmin" />
  <TeacherScheduleView v-else-if="isTeacher" />
  <StudentScheduleView v-else-if="isStudent" />
</template>
