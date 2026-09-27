// ============================================================
// useSubjects — semua logika DAFTAR + HAPUS mapel ada di sini.
// Mirror dari useStudents.ts, tapi TANPA pagination karena
// jumlah mapel sedikit (< 50 baris, seperti kelas).
//
// Cara pakai:
//   const s = useSubjects()
//   s.subjects        // daftar mapel
//   s.mintaHapus(m)   // buka modal konfirmasi
// ============================================================
import type { SubjectRow } from '~/types/subjects'
import { pesanDariError } from './useStudents'

export function useSubjects() {
  // ----- Fetch daftar mapel -----
  const { data, pending, error, refresh } = useFetch<{ data: SubjectRow[] }>('/api/subjects')

  const subjects = computed<SubjectRow[]>(() => data.value?.data ?? [])

  // ----- Filter status (client-side, data sedikit seperti kelas) -----
  const statusFilter = ref<'all' | 'active' | 'inactive'>('all')
  const filteredSubjects = computed(() => {
    if (statusFilter.value === 'active') return subjects.value.filter(m => m.isActive)
    if (statusFilter.value === 'inactive') return subjects.value.filter(m => !m.isActive)
    return subjects.value
  })

  // ----- Toast sederhana (tanpa library tambahan) -----
  const pesanSukses = ref('')
  const pesanError = ref('')

  function tutupToast() {
    pesanSukses.value = ''
    pesanError.value = ''
  }

  // ----- HAPUS: 3 langkah (minta -> batal/konfirmasi) -----
  const mapelYangDihapus = ref<SubjectRow | null>(null)
  const isDeleting = ref(false)

  /** Langkah 1: user klik "Hapus" → buka modal */
  function mintaHapus(mapel: SubjectRow) {
    tutupToast()
    mapelYangDihapus.value = mapel
  }

  /** Langkah 2a: user klik "Batal" → tutup modal */
  function batalHapus() {
    mapelYangDihapus.value = null
  }

  /** Langkah 2b: user klik "Ya, Hapus" → panggil API */
  async function konfirmasiHapus() {
    if (!mapelYangDihapus.value || isDeleting.value) return
    isDeleting.value = true
    try {
      await $fetch(`/api/subjects/${mapelYangDihapus.value.id}`, { method: 'DELETE' })
      mapelYangDihapus.value = null
      await refresh()
      pesanSukses.value = 'Mata pelajaran berhasil dihapus.'
    } catch (e: unknown) {
      pesanError.value = pesanDariError(e, 'Gagal menghapus mata pelajaran')
    } finally {
      isDeleting.value = false
    }
  }

  // ----- AKTIF/NONAKTIF: toggle 1 klik, tanpa modal (reversibel) -----
  const togglingId = ref<string | null>(null)

  async function toggleStatus(mapel: SubjectRow) {
    if (togglingId.value) return // cegah klik ganda
    togglingId.value = mapel.id
    try {
      await $fetch(`/api/subjects/${mapel.id}/status`, {
        method: 'PATCH',
        body: { isActive: !mapel.isActive },
      })
      await refresh()
      pesanSukses.value = mapel.isActive
        ? `${mapel.name} dinonaktifkan.`
        : `${mapel.name} diaktifkan kembali.`
    } catch (e: unknown) {
      pesanError.value = pesanDariError(e, 'Gagal mengubah status mapel')
    } finally {
      togglingId.value = null
    }
  }

  return {
    // list + filter status
    subjects, filteredSubjects, statusFilter, pending, error, refresh,
    // toggle aktif/nonaktif
    togglingId, toggleStatus,
    // toast
    pesanSukses, pesanError, tutupToast,
    // hapus
    mapelYangDihapus, isDeleting, mintaHapus, batalHapus, konfirmasiHapus,
  }
}
