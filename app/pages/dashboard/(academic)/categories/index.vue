<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: ['auth', 'role'], roles: ['admin'] })
await navigateTo('/dashboard/courses', { redirectCode: 301 })
</script>

<template><div /></template>
