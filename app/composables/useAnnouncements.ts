// ============================================================
// useAnnouncements — semua logika DAFTAR + CRUD pengumuman.
// Dipakai oleh AnnouncementListView.vue agar komponen tetap tipis.
// ============================================================
import type { AnnouncementListResponse, AnnouncementRow } from '~/types/announcement'
import { pesanDariError } from './useStudents'

export function useAnnouncements() {
  const { data, pending, error, refresh } = useFetch<AnnouncementListResponse>('/api/announcements')

  const announcements = computed<AnnouncementRow[]>(() => data.value?.data ?? [])
  const canManage = computed(() => data.value?.canManage ?? false)

  // ----- Toast sederhana -----
  const pesanSukses = ref('')
  const pesanError = ref('')
  function tutupToast() {
    pesanSukses.value = ''
    pesanError.value = ''
  }

  // ----- Filter: semua / terbit / draft -----
  const statusFilter = ref<'all' | 'published' | 'draft'>('all')
  const filteredAnnouncements = computed(() => {
    if (statusFilter.value === 'published') return announcements.value.filter((a) => a.isPublished)
    if (statusFilter.value === 'draft') return announcements.value.filter((a) => !a.isPublished)
    return announcements.value
  })

  // ----- HAPUS: konfirmasi 3 langkah -----
  const announcementToDelete = ref<AnnouncementRow | null>(null)
  const isDeleting = ref(false)

  function mintaHapus(row: AnnouncementRow) {
    tutupToast()
    announcementToDelete.value = row
  }

  function batalHapus() {
    announcementToDelete.value = null
  }

  async function konfirmasiHapus() {
    if (!announcementToDelete.value || isDeleting.value) return
    isDeleting.value = true
    try {
      await $fetch(`/api/announcements/${announcementToDelete.value.id}`, { method: 'DELETE' })
      announcementToDelete.value = null
      await refresh()
      pesanSukses.value = 'Pengumuman berhasil dihapus.'
    } catch (e: unknown) {
      pesanError.value = pesanDariError(e, 'Gagal menghapus pengumuman')
    } finally {
      isDeleting.value = false
    }
  }

  // ----- PUBLISH/UNPUBLISH: toggle 1 klik -----
  const togglingId = ref<string | null>(null)

  async function togglePublish(row: AnnouncementRow) {
    if (togglingId.value) return
    togglingId.value = row.id
    try {
      await $fetch(`/api/announcements/${row.id}`, {
        method: 'PATCH',
        body: { title: row.title, content: row.content, isPublished: !row.isPublished },
      })
      await refresh()
      pesanSukses.value = row.isPublished ? 'Pengumuman ditarik kembali ke draft.' : 'Pengumuman berhasil diterbitkan.'
    } catch (e: unknown) {
      pesanError.value = pesanDariError(e, 'Gagal mengubah status pengumuman')
    } finally {
      togglingId.value = null
    }
  }

  return {
    announcements, filteredAnnouncements, statusFilter, canManage,
    pending, error, refresh,
    togglingId, togglePublish,
    pesanSukses, pesanError, tutupToast,
    announcementToDelete, isDeleting, mintaHapus, batalHapus, konfirmasiHapus,
  }
}
