<!-- app/pages/dashboard/index.vue -->
<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth'],
})

const { user } = useAuth()
</script>

<template>
  <div>
    <AdminDashboard v-if="['admin', 'org_admin', 'owner'].includes(user?.role ?? '')" />
    <TeacherDashboard v-else-if="user?.role === 'teacher'" />
    <StudentDashboard v-else-if="user?.role === 'student'" />
    <ParentDashboard v-else-if="user?.role === 'parent'" />
  </div>
</template>