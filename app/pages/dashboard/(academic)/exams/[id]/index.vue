<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: ['auth', 'role'], roles: ['admin'] })
</script>
<template><AdminExamDetailView /></template>
