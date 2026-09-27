<script setup lang="ts">
const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'imported'): void }>()
const imp = useTeacherImport(async () => { emit('imported') })
const { importFile, importPreview, importErrors, isImporting, importResult, isDragging, canSubmitImport, resetImport, handleDownloadTemplate, handleFileInput, handleDrop, submitImport } = imp
watch(() => props.open, (v) => { if (v) resetImport() })
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" @click.self="emit('close')">
      <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div class="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <div>
            <h2 class="text-lg font-bold text-slate-800 dark:text-slate-100">Import Guru (CSV)</h2>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Kolom wajib: Nama, Email, NIP.</p>
          </div>
          <button class="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors" @click="emit('close')"><Icon name="heroicons:x-mark" class="w-5 h-5" /></button>
        </div>
        <div class="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center gap-2">
            <button type="button" class="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors" @click="handleDownloadTemplate"><Icon name="heroicons:arrow-down-tray" class="w-4 h-4" /> Download Template CSV</button>
            <p class="text-xs text-slate-500 dark:text-slate-400">Kolom: <code class="bg-slate-100 dark:bg-slate-700 px-1 rounded">Nama, Email, Password, Kode, NIP, Telepon, Alamat, Mapel</code></p>
          </div>
          <label class="block border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors" :class="isDragging ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30' : 'border-slate-300 dark:border-slate-600 hover:border-emerald-400 hover:bg-emerald-50/30 dark:hover:bg-emerald-900/20'" @dragover.prevent="isDragging = true" @dragleave.prevent="isDragging = false" @drop.prevent="handleDrop">
            <input type="file" accept=".csv,text/csv" class="hidden" @change="handleFileInput">
            <Icon name="heroicons:document-arrow-up" class="w-8 h-8 mx-auto mb-1 text-slate-400 dark:text-slate-500" />
            <p class="text-sm font-medium text-slate-700 dark:text-slate-300">{{ importFile ? importFile.name : 'Klik atau drop file CSV di sini' }}</p>
            <p class="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Format: .csv · Maks 5 MB · Maks 500 baris</p>
          </label>
          <div v-if="importErrors.length" class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 max-h-32 overflow-y-auto">
            <p class="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-1">Peringatan ({{ importErrors.length }})</p>
            <ul class="text-xs text-amber-700 dark:text-amber-400 list-disc list-inside space-y-0.5"><li v-for="(err, i) in importErrors" :key="i">{{ err }}</li></ul>
          </div>
          <div v-if="importPreview.length" class="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
            <div class="px-3 py-2 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700"><p class="text-xs font-semibold text-slate-700 dark:text-slate-300">Preview ({{ importPreview.length }} baris valid)</p></div>
            <div class="max-h-56 overflow-y-auto">
              <table class="w-full text-xs">
                <thead class="bg-slate-50 dark:bg-slate-800 sticky top-0"><tr><th class="text-left px-3 py-2 font-medium text-slate-600 dark:text-slate-400">Nama</th><th class="text-left px-3 py-2 font-medium text-slate-600 dark:text-slate-400">Email</th><th class="text-left px-3 py-2 font-medium text-slate-600 dark:text-slate-400">NIP</th><th class="text-left px-3 py-2 font-medium text-slate-600 dark:text-slate-400">Mapel</th></tr></thead>
                <tbody><tr v-for="(row, i) in importPreview" :key="i" class="border-t border-slate-100 dark:border-slate-700"><td class="px-3 py-2 text-slate-700 dark:text-slate-300">{{ row.name }}</td><td class="px-3 py-2 text-slate-500 dark:text-slate-400">{{ row.email }}</td><td class="px-3 py-2 font-mono text-xs text-slate-700 dark:text-slate-300">{{ row.nip }}</td><td class="px-3 py-2 text-slate-700 dark:text-slate-300">{{ row.subject || '-' }}</td></tr></tbody>
              </table>
            </div>
          </div>
          <div v-if="importResult" class="rounded-lg p-3 border" :class="importResult.failed === 0 ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800' : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'"><p class="text-sm font-semibold" :class="importResult.failed === 0 ? 'text-emerald-800 dark:text-emerald-300' : 'text-amber-800 dark:text-amber-300'">Berhasil: {{ importResult.success }} · Gagal: {{ importResult.failed }}</p></div>
        </div>
        <div class="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/80">
          <button class="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" @click="emit('close')">Tutup</button>
          <button :disabled="!canSubmitImport" class="px-4 py-2 text-sm font-semibold text-white rounded-lg bg-emerald-500 hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" @click="submitImport">{{ isImporting ? 'Mengimpor...' : `Import ${importPreview.length} Guru` }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
