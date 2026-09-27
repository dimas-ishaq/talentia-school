// ============================================================
// useSubjectImport — logika import CSV mapel.
// Mirror dari useStudentImport.ts (lebih ringan karena tidak perlu create user).
// ============================================================
import {
  type SubjectImportRow,
  parseSubjectCsv,
  validateSubjectFile,
  downloadSubjectTemplate,
} from '~/utils/subjectImport'
import { pesanDariError } from './useStudents'

export function useSubjectImport(onBerhasil: () => Promise<void> | void) {
  const importFile = ref<File | null>(null)
  const importPreview = ref<SubjectImportRow[]>([])
  const importErrors = ref<string[]>([])
  const isImporting = ref(false)
  const importResult = ref<{ success: number; failed: number } | null>(null)
  const isDragging = ref(false)

  const canSubmitImport = computed(
    () => importPreview.value.length > 0 && !isImporting.value,
  )

  function resetImport() {
    importFile.value = null
    importPreview.value = []
    importErrors.value = []
    importResult.value = null
  }

  function handleDownloadTemplate() {
    downloadSubjectTemplate()
  }

  async function parseFile(file: File) {
    importFile.value = file
    importResult.value = null
    importErrors.value = []
    importPreview.value = []

    const fileError = validateSubjectFile(file)
    if (fileError) { importErrors.value = [fileError]; return }

    const text = await file.text()
    const { rows, errors } = parseSubjectCsv(text)
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

  async function submitImport() {
    if (!importPreview.value.length) return
    isImporting.value = true
    importResult.value = null
    try {
      const res = await $fetch<{ success: number; failed: number; errors: string[] }>(
        '/api/subjects/import',
        { method: 'POST', body: { subjects: importPreview.value } },
      )
      importResult.value = { success: res.success, failed: res.failed }
      if (res.errors?.length) importErrors.value = res.errors
      await onBerhasil()
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
  }
}
