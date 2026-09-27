<script setup lang="ts">
definePageMeta({
  layout: "dashboard",
  middleware: ["auth", "role"],
  roles: ["admin"],
});

const route = useRoute();
const teacherId = route.params.id as string;
</script>

<template>
  <AdminTeacherFormView :teacher-id="teacherId" />
</template>