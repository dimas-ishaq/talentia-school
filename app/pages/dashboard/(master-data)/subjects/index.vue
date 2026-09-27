<!-- app/pages/dashboard/(master-data)/subjects/index.vue -->
<script setup lang="ts">
definePageMeta({
  layout: "dashboard",
  middleware: ["auth", "role"],
  roles: ["admin"],
});

const { user } = useAuth();
</script>

<template>
  <div>
    <AdminSubjectsView v-if="user?.role === 'admin'" />
  </div>
</template>
