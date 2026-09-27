<script setup lang="ts">
import { DEFAULT_TIMEZONE, TIMEZONE_OPTIONS } from '~~/shared/timezone'

definePageMeta({ layout: 'dashboard', middleware: ['auth', 'role'], roles: ['admin'] })

type SettingRow = { key: string; value: string; updatedAt: string }
const TIMEZONES = TIMEZONE_OPTIONS
const { data, refresh } = await useFetch<{ data: SettingRow[] }>('/api/settings')
const timezone = ref<string>(DEFAULT_TIMEZONE)
const timeFormat = ref<'12' | '24'>('24')
const uploadMaxMb = ref('10')
const saving = ref(false)
const message = ref('')
const error = ref('')
watch(data, (value) => { const rows = value?.data ?? []; timezone.value = rows.find(item => item.key === 'school.timezone')?.value || DEFAULT_TIMEZONE; timeFormat.value = rows.find(item => item.key === 'school.time_format')?.value === '12' ? '12' : '24'; uploadMaxMb.value = rows.find(item => item.key === 'upload.max_size_mb')?.value || '10' }, { immediate: true })

async function saveTimezone() {
  message.value = ''
  error.value = ''
  saving.value = true
  try {
    await $fetch('/api/settings', {
      method: 'PUT',
      body: { items: [{ key: 'school.timezone', value: timezone.value }, { key: 'school.time_format', value: timeFormat.value }, { key: 'upload.max_size_mb', value: String(uploadMaxMb.value) }] },
    })
    await refresh()
    message.value = 'Pengaturan berhasil disimpan.'
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.message || 'Gagal menyimpan pengaturan waktu.'
  } finally { saving.value = false }
}

</script>

<template>
  <div class="space-y-5">
    <div class="flex items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-slate-800 dark:text-slate-100">Pengaturan</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Kelola konfigurasi sistem sekolah.</p>
      </div>
    </div>

    <div v-if="message" class="rounded-lg bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">{{ message }}</div>
    <div v-if="error" class="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">{{ error }}</div>

    <section class="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <h2 class="font-semibold text-slate-800 dark:text-slate-100">Zona waktu sekolah</h2>
      <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Dipakai untuk input dan tampilan tanggal/jam.</p>
      <div class="mt-3 flex max-w-xl flex-wrap gap-3">
        <select v-model="timezone" class="h-10 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800">
          <option v-for="zone in TIMEZONES" :key="zone.value" :value="zone.value">{{ zone.label }}</option>
        </select>
        <select v-model="timeFormat" class="h-10 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800">
          <option value="24">24 jam (13:30)</option>
          <option value="12">12 jam (01:30 PM)</option>
        </select>
        <button type="button" :disabled="saving" class="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" @click="saveTimezone">Simpan</button>
      </div>
    </section>

    <section class="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <h2 class="font-semibold text-slate-800 dark:text-slate-100">Upload file global</h2>
      <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Batas ukuran semua file yang diunggah guru/admin. Nilai 1–100 MB.</p>
      <div class="mt-3 flex max-w-xl gap-3">
        <input v-model="uploadMaxMb" type="number" min="1" max="100" required class="h-10 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800">
        <span class="flex items-center text-sm text-slate-500">MB</span>
        <button type="button" :disabled="saving" class="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" @click="saveTimezone">Simpan</button>
      </div>
    </section>

  </div>
</template>
