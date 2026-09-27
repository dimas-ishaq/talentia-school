<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth'],
})

const { user } = useAuth()
</script>

<template>
  <div>
    <AdminCalendarView v-if="user?.role === 'admin'" />
    <TeacherCalendarView v-else-if="user?.role === 'teacher'" />
    <StudentCalendarView v-else-if="user?.role === 'student'" />
    <ParentCalendarView v-else-if="user?.role === 'parent'" />
  </div>
</template>
