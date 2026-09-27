<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: ['auth'] })
const { user } = useAuth()
</script>
<template><AdminExamListView v-if="user?.role === 'admin'" /><StudentExamListView v-else-if="user?.role === 'student'" /><ComingSoonView v-else title="Ujian" description="Daftar ujian hanya tersedia untuk admin dan siswa." /></template>
