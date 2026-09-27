<script setup lang="ts">
definePageMeta({ layout: 'quiz', middleware: ['auth', 'role'], roles: ['student'] })
</script>
<template><QuizTakeView /></template>
