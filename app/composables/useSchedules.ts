// app/composables/useSchedules.ts
// Semua logika fetch jadwal + filter + toast ada di sini.
// Digunakan oleh AdminScheduleView, StudentScheduleView, TeacherScheduleView.
import type { ScheduleRow, ScheduleListResponse } from '~/types/schedule'
import { pesanDariError } from './useStudents'

export function useSchedules() {
  const dayOfWeek = ref<number | ''>('')
  const classId = ref('')
  const teacherId = ref('')
  const showInactive = ref(true)

  // ----- Fetch jadwal (role-aware di server) -----
  const query = computed(() => {
    const q: Record<string, string> = {}
    if (dayOfWeek.value) q.dayOfWeek = String(dayOfWeek.value)
    if (classId.value) q.classId = classId.value
    if (teacherId.value) q.teacherId = teacherId.value
    if (!showInactive.value) q.showInactive = '0'
    return q
  })

  const { data, pending, error, refresh } = useFetch<ScheduleListResponse>('/api/schedules', {
    query,
    watch: [query],
  })

  const schedules = computed<ScheduleRow[]>(() => data.value?.data ?? [])

  // ----- Toast -----
  const pesanSukses = ref('')
  const pesanError = ref('')
  function tutupToast() { pesanSukses.value = ''; pesanError.value = '' }

  // ----- Toggle status (admin) -----
  const togglingId = ref<string | null>(null)

  async function toggleStatus(item: ScheduleRow) {
    if (togglingId.value) return
    togglingId.value = item.id
    try {
      await $fetch(`/api/schedules/${item.id}`, {
        method: 'PATCH',
        body: { isActive: !item.isActive },
      })
      await refresh()
      pesanSukses.value = item.isActive
        ? `Jadwal ${item.subjectName} ${item.className} dinonaktifkan.`
        : `Jadwal ${item.subjectName} ${item.className} diaktifkan kembali.`
    } catch (e: unknown) {
      pesanError.value = pesanDariError(e, 'Gagal mengubah status jadwal')
    } finally {
      togglingId.value = null
    }
  }

  // ----- Hapus -----
  const itemYangDihapus = ref<ScheduleRow | null>(null)
  const isDeleting = ref(false)

  function mintaHapus(item: ScheduleRow) { tutupToast(); itemYangDihapus.value = item }
  function batalHapus() { itemYangDihapus.value = null }

  async function konfirmasiHapus() {
    if (!itemYangDihapus.value || isDeleting.value) return
    isDeleting.value = true
    try {
      await $fetch(`/api/schedules/${itemYangDihapus.value.id}`, { method: 'DELETE' })
      itemYangDihapus.value = null
      await refresh()
      pesanSukses.value = 'Jadwal berhasil dihapus.'
    } catch (e: unknown) {
      pesanError.value = pesanDariError(e, 'Gagal menghapus jadwal')
    } finally {
      isDeleting.value = false
    }
  }

  return {
    schedules, pending, error, refresh,
    dayOfWeek, classId, teacherId, showInactive,
    togglingId, toggleStatus,
    pesanSukses, pesanError, tutupToast,
    itemYangDihapus, isDeleting, mintaHapus, batalHapus, konfirmasiHapus,
  }
}
