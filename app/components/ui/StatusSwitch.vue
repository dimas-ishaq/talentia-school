<!-- ============================================================
  StatusSwitch — tombol geser Aktif/Nonaktif dipakai 4 halaman:
  siswa, guru, kelas, mapel. Satu komponen supaya tampilan
  dan perilaku selalu sama.

  Cara pakai:
    <StatusSwitch :active="row.isActive" :loading="..." @toggle="..." />
  ============================================================ -->
<script setup lang="ts">
withDefaults(defineProps<{
  active?: boolean
  loading?: boolean
}>(), {
  active: true,
  loading: false,
})

defineEmits<{
  toggle: []
}>()
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="active"
    :disabled="loading"
    :title="active ? 'Klik untuk menonaktifkan' : 'Klik untuk mengaktifkan'"
    class="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-wait"
    :class="active ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'"
    @click="$emit('toggle')"
  >
    <span
      class="inline-block h-4 w-4 rounded-full bg-white shadow transition-transform"
      :class="active ? 'translate-x-4' : 'translate-x-0.5'"
    />
  </button>
</template>
