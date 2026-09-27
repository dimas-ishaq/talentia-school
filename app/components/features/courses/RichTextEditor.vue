<script setup lang="ts">
import { compressImage } from '~/utils/imageCompress'

const props = defineProps<{ modelValue: string; placeholder?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const editor = ref<HTMLElement | null>(null)
const imageInput = ref<HTMLInputElement | null>(null)
const uploadingImage = ref(false)
const uploadError = ref('')
let savedRange: Range | null = null

const tools = [
  { command: 'bold', label: 'B', title: 'Tebal' },
  { command: 'italic', label: 'I', title: 'Miring' },
  { command: 'underline', label: 'U', title: 'Garis bawah' },
  { command: 'insertUnorderedList', label: '• List', title: 'Daftar bullet' },
  { command: 'insertOrderedList', label: '1. List', title: 'Daftar nomor' },
  { command: 'formatBlock', value: 'blockquote', label: '“', title: 'Kutipan' },
]

function run(command: string, value?: string) {
  editor.value?.focus()
  document.execCommand(command, false, value)
  emitValue()
}
function promptLink() {
  const url = window.prompt('URL link')
  if (url) run('createLink', url)
}
function emitValue() { emit('update:modelValue', editor.value?.innerHTML || '') }
function sync() {
  if (editor.value && editor.value.innerHTML !== props.modelValue) editor.value.innerHTML = props.modelValue || ''
}
onMounted(sync)
watch(() => props.modelValue, sync)

// Simpan posisi kursor agar gambar disisipkan tepat di tempat kursor berada.
function saveSelection() {
  const sel = window.getSelection()
  if (sel && sel.rangeCount && editor.value?.contains(sel.anchorNode)) {
    savedRange = sel.getRangeAt(0).cloneRange()
  }
}
function restoreSelection() {
  const sel = window.getSelection()
  if (!sel) return
  sel.removeAllRanges()
  if (savedRange) sel.addRange(savedRange)
  else {
    const range = document.createRange()
    range.selectNodeContents(editor.value!)
    range.collapse(false)
    sel.addRange(range)
  }
}
function insertImage(url: string, alt: string) {
  editor.value?.focus()
  restoreSelection()
  document.execCommand('insertHTML', false, `<img src="${url}" alt="${alt.replace(/"/g, '')}" style="max-width:100%">`)
  emitValue()
}
async function handleImageUpload(e: Event) {
  const input = e.target as HTMLInputElement
  const original = input.files?.[0]
  if (!original) return
  uploadingImage.value = true
  uploadError.value = ''
  try {
    // Kompres dulu di browser: max 1600px, WebP q=0.82.
    const file = await compressImage(original)
    const body = new FormData()
    body.append('file', file)
    const res = await $fetch<{ data: { url: string; name: string } }>('/api/uploads', { method: 'POST', body })
    insertImage(res.data.url, res.data.name)
  } catch (err: unknown) {
    const data = (err as { data?: { statusMessage?: string } })?.data
    uploadError.value = data?.statusMessage || 'Gagal mengunggah gambar'
  } finally {
    uploadingImage.value = false
    input.value = ''
  }
}
function pickImage() {
  saveSelection()
  imageInput.value?.click()
}
</script>

<template>
  <div class="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-600">
    <div class="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 p-2 dark:border-slate-600 dark:bg-slate-700/50">
      <button v-for="tool in tools" :key="tool.command" type="button" :title="tool.title" class="min-w-8 rounded px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-600" @mousedown.prevent="run(tool.command, tool.value)">{{ tool.label }}</button>
      <button type="button" title="Link" class="rounded px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-600" @mousedown.prevent="promptLink">Link</button>
      <button type="button" title="Sisipkan gambar" :disabled="uploadingImage" class="rounded px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-white disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-600" @mousedown.prevent="pickImage">{{ uploadingImage ? '...' : '🖼 Gambar' }}</button>
      <input ref="imageInput" type="file" accept="image/png,image/jpeg,image/gif,image/webp" class="hidden" @change="handleImageUpload">
      <span class="ml-auto self-center text-[11px] text-slate-400">Gambar dikompres otomatis</span>
    </div>
    <p v-if="uploadError" class="border-b border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">{{ uploadError }}</p>
    <div ref="editor" contenteditable="true" role="textbox" :aria-label="placeholder || 'Materi pembelajaran'" :data-placeholder="placeholder || 'Tulis materi pembelajaran...'" class="rich-editor min-h-56 bg-white p-3 text-sm leading-7 text-slate-800 outline-none empty:before:text-slate-400 empty:before:content-[attr(data-placeholder)] dark:bg-slate-800 dark:text-slate-200" @input="emitValue" @keyup="saveSelection" @mouseup="saveSelection" @blur="saveSelection" />
  </div>
</template>

<style scoped>
.rich-editor :deep(h2) { font-size: 1.25rem; font-weight: 700; margin: 1rem 0 .5rem; }
.rich-editor :deep(h3) { font-size: 1.1rem; font-weight: 700; margin: .75rem 0 .35rem; }
.rich-editor :deep(ul) { list-style: disc; padding-left: 1.5rem; }
.rich-editor :deep(ol) { list-style: decimal; padding-left: 1.5rem; }
.rich-editor :deep(blockquote) { border-left: 3px solid #10b981; padding-left: .75rem; color: #64748b; }
.rich-editor :deep(img) { display: block; max-width: 100%; margin: .75rem auto; border-radius: .5rem; }
</style>
