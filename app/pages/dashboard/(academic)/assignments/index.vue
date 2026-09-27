<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: ['auth'], roles: ['student', 'teacher', 'parent'] })
</script>
<template><ComingSoonView title="Tugas Aktif" description="Tugas belum tersedia. Kelola penugasan melalui Course." /></template>
