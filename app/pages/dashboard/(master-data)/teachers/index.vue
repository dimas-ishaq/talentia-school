<script setup lang="ts">
definePageMeta({
  layout: "dashboard",
  middleware: ["auth", "role"],
  roles: ["admin", "org_admin", "owner"],
});
</script>

<template>
  <AdminTeacherView />
</template>