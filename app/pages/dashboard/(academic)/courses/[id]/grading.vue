<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: ['auth', 'role'], roles: ['teacher', 'admin'] })
</script>

<template>
  <CoursePendingGradingView />
</template>
