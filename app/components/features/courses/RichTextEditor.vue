<script setup lang="ts">
import { EditorContent, useEditor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import Typography from '@tiptap/extension-typography'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import { compressImage } from '~/utils/imageCompress'

const props = withDefaults(defineProps<{
  modelValue: string
  placeholder?: string
  minHeight?: string
}>(), { placeholder: 'Tulis di sini...', minHeight: 'min-h-56' })
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const imageInput = ref<HTMLInputElement | null>(null)
const uploadingImage = ref(false)
const uploadError = ref('')

const editor = useEditor({
  // @ts-expect-error TipTap 2 menambahkan immediatelyRender; @types belum update
  immediatelyRender: false,
  content: props.modelValue,
  extensions: [
    StarterKit,
    Underline,
    Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' } }),
    Image.configure({ inline: false, allowBase64: false }),
    Placeholder.configure({ placeholder: props.placeholder }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Highlight,
    Typography,
    Table.configure({ resizable: true }), TableRow, TableHeader, TableCell,
  ],
  editorProps: { attributes: { role: 'textbox', 'aria-label': props.placeholder } },
  onUpdate: ({ editor: value }) => emit('update:modelValue', value.getHTML()),
})

watch(() => props.modelValue, value => {
  if (editor.value && value !== editor.value.getHTML()) editor.value.commands.setContent(value || '', { emitUpdate: false })
})

function command(action: () => boolean) { action() }
function setLink() {
  if (!editor.value) return
  const previous = editor.value.getAttributes('link').href
  const url = window.prompt('URL link', previous || 'https://')
  if (url === null) return
  if (!url.trim()) editor.value.chain().focus().unsetLink().run()
  else editor.value.chain().focus().setLink({ href: url.trim() }).run()
}
function pickImage() { imageInput.value?.click() }
async function handleImageUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const original = input.files?.[0]
  if (!original || !editor.value) return
  uploadingImage.value = true; uploadError.value = ''
  try {
    const body = new FormData()
    body.append('file', await compressImage(original))
    const response = await $fetch<{ data: { url: string; name: string } }>('/api/uploads', { method: 'POST', body })
    editor.value.chain().focus().setImage({ src: response.data.url, alt: response.data.name }).run()
  } catch (error: any) {
    uploadError.value = error?.data?.statusMessage || 'Gagal mengunggah gambar'
  } finally { uploadingImage.value = false; input.value = '' }
}
</script>

<template>
  <div class="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-600">
    <div v-if="editor" class="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 p-2 dark:border-slate-600 dark:bg-slate-700/50">
      <button type="button" title="Undo" class="tool" :disabled="!editor.can().undo()" @click="command(() => editor!.chain().focus().undo().run())">↶</button>
      <button type="button" title="Redo" class="tool" :disabled="!editor.can().redo()" @click="command(() => editor!.chain().focus().redo().run())">↷</button>
      <span class="divider" />
      <button type="button" title="Judul 1" class="tool" :class="{ active: editor.isActive('heading', { level: 2 }) }" @click="command(() => editor!.chain().focus().toggleHeading({ level: 2 }).run())">H2</button>
      <button type="button" title="Judul 2" class="tool" :class="{ active: editor.isActive('heading', { level: 3 }) }" @click="command(() => editor!.chain().focus().toggleHeading({ level: 3 }).run())">H3</button>
      <button type="button" title="Tebal" class="tool" :class="{ active: editor.isActive('bold') }" @click="command(() => editor!.chain().focus().toggleBold().run())"><strong>B</strong></button>
      <button type="button" title="Miring" class="tool" :class="{ active: editor.isActive('italic') }" @click="command(() => editor!.chain().focus().toggleItalic().run())"><em>I</em></button>
      <button type="button" title="Garis bawah" class="tool" :class="{ active: editor.isActive('underline') }" @click="command(() => editor!.chain().focus().toggleUnderline().run())"><u>U</u></button>
      <button type="button" title="Coret" class="tool" :class="{ active: editor.isActive('strike') }" @click="command(() => editor!.chain().focus().toggleStrike().run())"><s>S</s></button>
      <button type="button" title="Sorot" class="tool" :class="{ active: editor.isActive('highlight') }" @click="command(() => editor!.chain().focus().toggleHighlight().run())">▰</button>
      <button type="button" title="Daftar bullet" class="tool" :class="{ active: editor.isActive('bulletList') }" @click="command(() => editor!.chain().focus().toggleBulletList().run())">• List</button>
      <button type="button" title="Daftar nomor" class="tool" :class="{ active: editor.isActive('orderedList') }" @click="command(() => editor!.chain().focus().toggleOrderedList().run())">1. List</button>
      <button type="button" title="Kutipan" class="tool" :class="{ active: editor.isActive('blockquote') }" @click="command(() => editor!.chain().focus().toggleBlockquote().run())">“</button>
      <button type="button" title="Kode" class="tool" :class="{ active: editor.isActive('codeBlock') }" @click="command(() => editor!.chain().focus().toggleCodeBlock().run())">&lt;/&gt;</button>
      <span class="divider" />
      <button type="button" title="Rata kiri" class="tool" @click="command(() => editor!.chain().focus().setTextAlign('left').run())">≡</button>
      <button type="button" title="Rata tengah" class="tool" @click="command(() => editor!.chain().focus().setTextAlign('center').run())">≡</button>
      <button type="button" title="Rata kanan" class="tool" @click="command(() => editor!.chain().focus().setTextAlign('right').run())">≡</button>
      <button type="button" title="Link" class="tool" :class="{ active: editor.isActive('link') }" @click="setLink">Link</button>
      <button type="button" title="Sisipkan tabel" class="tool" @click="command(() => editor!.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run())">Tabel</button>
      <button type="button" title="Sisipkan gambar" class="tool" :disabled="uploadingImage" @click="pickImage">{{ uploadingImage ? '...' : 'Gambar' }}</button>
      <input ref="imageInput" type="file" accept="image/png,image/jpeg,image/gif,image/webp" class="hidden" @change="handleImageUpload">
    </div>
    <p v-if="uploadError" class="border-b border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">{{ uploadError }}</p>
    <EditorContent v-if="editor" :editor="editor" class="rich-editor" :class="minHeight" />
  </div>
</template>

<style scoped>
.tool { min-width: 2rem; border-radius: .375rem; padding: .3rem .5rem; font-size: .75rem; font-weight: 600; color: #475569; }
.tool:hover, .tool.active { background: white; color: #059669; }
.tool:disabled { cursor: not-allowed; opacity: .4; }
.divider { height: 1.25rem; width: 1px; background: #cbd5e1; margin: 0 .15rem; }
.rich-editor :deep(.tiptap) { padding: .75rem; outline: none; line-height: 1.75; color: #1e293b; }
.rich-editor :deep(.tiptap p.is-editor-empty:first-child::before) { color: #94a3b8; content: attr(data-placeholder); float: left; height: 0; pointer-events: none; }
.rich-editor :deep(h2) { margin: 1rem 0 .5rem; font-size: 1.25rem; font-weight: 700; }
.rich-editor :deep(h3) { margin: .75rem 0 .35rem; font-size: 1.1rem; font-weight: 700; }
.rich-editor :deep(ul) { list-style: disc; padding-left: 1.5rem; }
.rich-editor :deep(ol) { list-style: decimal; padding-left: 1.5rem; }
.rich-editor :deep(blockquote) { border-left: 3px solid #10b981; padding-left: .75rem; color: #64748b; }
.rich-editor :deep(pre) { border-radius: .5rem; background: #0f172a; color: #e2e8f0; padding: .75rem; }
.rich-editor :deep(img) { display: block; max-width: 100%; margin: .75rem auto; border-radius: .5rem; }
.rich-editor :deep(table) { border-collapse: collapse; margin: .75rem 0; width: 100%; }
.rich-editor :deep(th), .rich-editor :deep(td) { border: 1px solid #cbd5e1; padding: .35rem .5rem; min-width: 5rem; }
.rich-editor :deep(th) { background: #f1f5f9; font-weight: 700; }
.dark .rich-editor :deep(.tiptap) { color: #e2e8f0; }
.dark .tool { color: #e2e8f0; }
.dark .tool:hover, .dark .tool.active { background: #475569; }
.dark .divider { background: #64748b; }
.dark .rich-editor :deep(th) { background: #334155; }
.dark .rich-editor :deep(th), .dark .rich-editor :deep(td) { border-color: #64748b; }
</style>
