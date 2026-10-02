<!-- app/pages/dashboard/index.vue -->
<script setup lang="ts">
definePageMeta({
  layout: "dashboard",
  middleware: ["auth", "role"],
  roles: ["admin", "org_admin", "owner"]
});

const { isAdmin } = useAuth();
</script>

<template>
  <div>
    <AdminClassesView v-if="isAdmin" />
    <!-- <TeacherDashboard v-else-if="user?.role === 'teacher'" />
    <StudentDashboard v-else-if="user?.role === 'student'" />
    <ParentDashboard v-else-if="user?.role === 'parent'" /> -->
  </div>
</template>
