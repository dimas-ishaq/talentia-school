// app/composables/useScheduleImport.ts
// Composable untuk import jadwal (mirror useStudentImport).
import type { ScheduleImportRow } from '~/utils/scheduleImport'
import {
  parseScheduleCsv,
  validateScheduleFile,
  downloadScheduleTemplate,
} from '~/utils/scheduleImport'
import { pesanDariError } from './useStudents'

interface Props {
  onImported?: () => Promise<void> | void
}

export function useScheduleImport(props: Props) {
  const importFile = ref<File | null>(null)
  const importPreview = ref<ScheduleImportRow[]>([])
  const importErrors = ref<string[]>([])
  const isImporting = ref(false)
  const importResult = ref<{ success: number; failed: number; errors: string[] } | null>(null)
  const isDragging = ref(false)

  const canSubmitImport = computed(() => importPreview.value.length > 0 && !isImporting.value)

  function resetImport() {
    importFile.value = null
    importPreview.value = []
    importErrors.value = []
    importResult.value = null
  }

  function handleDownloadTemplate() {
    downloadScheduleTemplate()
  }

  async function parseFile(file: File) {
    importFile.value = file
    importResult.value = null
    importErrors.value = []
    importPreview.value = []

    const fileError = validateScheduleFile(file)
    if (fileError) {
      importErrors.value = [fileError]
      return
    }

    const text = await file.text()
    const { rows, errors } = parseScheduleCsv(text)
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
        '/api/schedules/import',
        { method: 'POST', body: { rows: importPreview.value } },
      )
      importResult.value = {
        success: res.success,
        failed: res.failed,
        errors: res.errors ?? [],
      }
      if (res.errors?.length) importErrors.value = res.errors
      await props.onImported?.()
      if (res.failed === 0) importPreview.value = []
    } catch (e: unknown) {
      importErrors.value = [pesanDariError(e, 'Gagal mengimpor jadwal')]
    } finally {
      isImporting.value = false
    }
  }

  return {
    importFile,
    importPreview,
    importErrors,
    isImporting,
    importResult,
    isDragging,
    canSubmitImport,
    resetImport,
    handleDownloadTemplate,
    parseFile,
    handleFileInput,
    handleDrop,
    submitImport,
  }
}
