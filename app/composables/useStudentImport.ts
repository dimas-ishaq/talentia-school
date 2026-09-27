// ============================================================
// useStudentImport — semua logika IMPORT CSV ada di sini.
// Dipakai oleh komponen StudentImportModal.vue.
// AdminStudentView.vue tidak perlu tahu detail parsing CSV.
// ============================================================
import {
  type StudentImportRow,
  parseStudentCsv,
  validateStudentFile,
  downloadStudentTemplate,
  defaultStudentEmail,
} from '~/utils/studentImport'
import { pesanDariError } from './useStudents'

export function useStudentImport(onBerhasil: () => Promise<void> | void) {
  const importFile = ref<File | null>(null)
  const importPreview = ref<StudentImportRow[]>([])
  const importErrors = ref<string[]>([])
  const isImporting = ref(false)
  const importResult = ref<{ success: number; failed: number } | null>(null)
  const isDragging = ref(false)

  const canSubmitImport = computed(
    () => importPreview.value.length > 0 && !isImporting.value,
  )

  /** Reset setiap kali modal dibuka */
  function resetImport() {
    importFile.value = null
    importPreview.value = []
    importErrors.value = []
    importResult.value = null
  }

  function handleDownloadTemplate() {
    downloadStudentTemplate()
  }

  /** Baca & validasi 1 file CSV */
  async function parseFile(file: File) {
    importFile.value = file
    importResult.value = null
    importErrors.value = []
    importPreview.value = []

    const fileError = validateStudentFile(file)
    if (fileError) {
      importErrors.value = [fileError]
      return
    }

    const text = await file.text()
    const { rows, errors } = parseStudentCsv(text)
    importPreview.value = rows
    importErrors.value = errors
  }

  async function handleFileInput(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (file) await parseFile(file)
  }

  async function handleDrop(e: DragEvent) {
    isDragging.value = false
    const file = e.dataTransfer?.files?.[0]
    if (file) await parseFile(file)
  }

  /** Kirim data preview ke server */
  async function submitImport() {
    if (!importPreview.value.length) return
    isImporting.value = true
    importResult.value = null
    try {
      const res = await $fetch<{ success: number; failed: number; errors: string[] }>(
        '/api/students/import',
        { method: 'POST', body: { students: importPreview.value } },
      )
      importResult.value = { success: res.success, failed: res.failed }
      if (res.errors?.length) importErrors.value = res.errors
      await onBerhasil() // refresh tabel di belakang modal
      if (res.failed === 0) importPreview.value = []
    } catch (e: unknown) {
      importErrors.value = [pesanDariError(e, 'Gagal mengimpor data')]
    } finally {
      isImporting.value = false
    }
  }

  return {
    importFile, importPreview, importErrors, isImporting,
    importResult, isDragging, canSubmitImport,
    resetImport, handleDownloadTemplate, parseFile,
    handleFileInput, handleDrop, submitImport,
    defaultStudentEmail,
  }
}
