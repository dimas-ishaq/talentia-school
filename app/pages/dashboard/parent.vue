<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: ['auth', 'role'], roles: ['parent'] })
</script>
<template><ParentDashboard /></template>
