<!-- app/pages/dashboard/(master-data)/subjects/index.vue -->
<script setup lang="ts">
definePageMeta({
  layout: "dashboard",
  middleware: ["auth", "role"],
  roles: ["admin", "org_admin", "owner"],
});

const { isAdmin } = useAuth();
</script>

<template>
  <div>
    <AdminSubjectsView v-if="isAdmin" />
  </div>
</template>
