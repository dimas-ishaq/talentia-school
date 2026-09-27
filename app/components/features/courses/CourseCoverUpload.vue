<script setup lang="ts">
import { compressImage } from '~/utils/imageCompress'

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const uploading = ref(false)
const errorMessage = ref('')

async function upload(event: Event) {
  const input = event.target as HTMLInputElement
  const original = input.files?.[0]
  if (!original) return
  errorMessage.value = ''
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(original.type)) {
    errorMessage.value = 'Gunakan JPG, PNG, atau WebP.'
    input.value = ''
    return
  }
  uploading.value = true
  try {
    const file = await compressImage(original, { maxWidth: 1600, maxHeight: 900, quality: 0.8 })
    if (file.size > 2 * 1024 * 1024) throw new Error('Ukuran gambar setelah kompresi masih lebih dari 2 MB.')
    const body = new FormData()
    body.append('file', file)
    const response = await $fetch<{ data: { url: string } }>('/api/uploads', { method: 'POST', body })
    emit('update:modelValue', response.data.url)
  } catch (error: any) {
    errorMessage.value = error?.data?.statusMessage || error?.message || 'Gagal mengunggah gambar.'
  } finally {
    uploading.value = false
    input.value = ''
  }
}
</script>

<template>
  <div>
    <label class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Gambar Sampul (opsional)</label>
    <div class="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-600 dark:bg-slate-700">
      <img v-if="modelValue" :src="modelValue" alt="Pratinjau sampul course" class="aspect-[16/7] w-full object-cover">
      <div v-else class="flex aspect-[16/7] w-full items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
        <div class="text-center">
          <Icon name="heroicons:photo" class="mx-auto h-8 w-8 opacity-60" />
          <p class="mt-1 text-xs font-medium text-emerald-50">Belum ada gambar sampul</p>
        </div>
      </div>
      <div class="absolute inset-0 flex items-end justify-end gap-2 bg-gradient-to-t from-black/50 to-transparent p-3 opacity-0 transition group-hover:opacity-100 [.relative:hover_&]:opacity-100">
        <label class="cursor-pointer rounded-lg bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-white">
          {{ uploading ? 'Mengompres...' : modelValue ? 'Ganti' : 'Unggah' }}
          <input type="file" accept="image/jpeg,image/png,image/webp" class="hidden" :disabled="uploading" @change="upload">
        </label>
        <button v-if="modelValue" type="button" class="rounded-lg bg-red-500/90 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600" @click="emit('update:modelValue', '')">Hapus</button>
      </div>
    </div>
    <p class="mt-1.5 text-xs text-slate-400 dark:text-slate-500">Rekomendasi 1600 × 700 px (rasio lebar 16:7). JPG, PNG, WebP. Maksimal 2 MB setelah kompresi.</p>
    <p v-if="errorMessage" class="mt-1 text-xs text-red-600 dark:text-red-400">{{ errorMessage }}</p>
  </div>
</template>
