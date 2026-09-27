// ============================================================
// useStudents — semua logika DAFTAR + HAPUS siswa ada di sini.
// AdminStudentView.vue tinggal pakai, jadi filenya tetap pendek.
//
// Cara pakai:
//   const s = useStudents()
//   s.students  // daftar siswa
//   s.mintaHapus(siswa) // buka modal konfirmasi
// ============================================================
import type { Student, StudentListResponse } from '~/types/student'

export function useStudents() {
  // ----- Pagination + filter status -----
  const page = ref(1)
  const perPage = 10 // konstanta, tidak perlu diubah-ubah
  // 'all' = semua, 'active' = aktif saja, 'inactive' = nonaktif saja
  const statusFilter = ref<'all' | 'active' | 'inactive'>('all')
  const search = ref('')
  const classIdFilter = ref('')
  const genderFilter = ref<'' | 'L' | 'P'>('')

  // ----- Fetch daftar siswa (otomatis refresh saat page/filter berubah) -----
  const { data, pending, error, refresh } = useFetch<StudentListResponse>('/api/students', {
    query: { page, perPage, status: statusFilter, search, classId: classIdFilter, gender: genderFilter },
    watch: [page, statusFilter, search, classIdFilter, genderFilter],
  })

  // Ganti filter → kembali ke halaman 1 agar tidak dapat halaman kosong
  watch([statusFilter, search, classIdFilter, genderFilter], () => { page.value = 1 })

  const students = computed<Student[]>(() => data.value?.data ?? [])
  const meta = computed(() => data.value?.meta)

  // ----- Nomor urut baris (1, 2, 3 ... lintas halaman) -----
  function nomorUrut(indexDiHalaman: number): number {
    const halaman = meta.value?.page ?? 1
    const perHalaman = meta.value?.perPage ?? perPage
    return (halaman - 1) * perHalaman + indexDiHalaman + 1
  }

  // ----- Toast sederhana (tanpa library tambahan) -----
  const pesanSukses = ref('')
  const pesanError = ref('')

  function tutupToast() {
    pesanSukses.value = ''
    pesanError.value = ''
  }

  // Tampilkan pesan "data berhasil ditambah" setelah redirect dari /create
  const route = useRoute()
  if (route.query.created === '1') {
    pesanSukses.value = 'Data siswa berhasil ditambahkan.'
  }
  if (route.query.updated === '1') {
    pesanSukses.value = 'Data siswa berhasil diupdate.'
  }

  // ----- HAPUS: 3 langkah (minta -> batal/konfirmasi) -----
  // Konfirmasi memakai modal custom agar bisa di-style dan accessible.
  const siswaYangDihapus = ref<Student | null>(null)
  const isDeleting = ref(false)

  /** Langkah 1: user klik "Hapus" → buka modal */
  function mintaHapus(siswa: Student) {
    tutupToast()
    siswaYangDihapus.value = siswa
  }

  /** Langkah 2a: user klik "Batal" → tutup modal */
  function batalHapus() {
    siswaYangDihapus.value = null
  }

  /** Langkah 2b: user klik "Ya, Hapus" → panggil API */
  async function konfirmasiHapus() {
    if (!siswaYangDihapus.value || isDeleting.value) return
    isDeleting.value = true
    try {
      await $fetch(`/api/students/${siswaYangDihapus.value.id}`, { method: 'DELETE' })
      siswaYangDihapus.value = null
      await refresh()
      pesanSukses.value = 'Data siswa berhasil dihapus.'
    } catch (e: unknown) {
      pesanError.value = pesanDariError(e, 'Gagal menghapus siswa')
    } finally {
      isDeleting.value = false
    }
  }

  // ----- AKTIF/NONAKTIF: toggle 1 klik, tanpa modal (reversibel) -----
  const togglingId = ref<string | null>(null)

  async function toggleStatus(siswa: Student) {
    if (togglingId.value) return // cegah klik ganda
    togglingId.value = siswa.id
    try {
      await $fetch(`/api/students/${siswa.id}/status`, {
        method: 'PATCH',
        body: { isActive: !siswa.isActive },
      })
      await refresh()
      pesanSukses.value = siswa.isActive
        ? `${siswa.name} dinonaktifkan (tidak bisa login).`
        : `${siswa.name} diaktifkan kembali.`
    } catch (e: unknown) {
      pesanError.value = pesanDariError(e, 'Gagal mengubah status siswa')
    } finally {
      togglingId.value = null
    }
  }

  return {
    // list
    page, students, meta, pending, error, refresh, nomorUrut,
    // filter status + toggle aktif/nonaktif
    statusFilter, togglingId, toggleStatus,
    search, classIdFilter, genderFilter,
    // toast
    pesanSukses, pesanError, tutupToast,
    // hapus
    siswaYangDihapus, isDeleting, mintaHapus, batalHapus, konfirmasiHapus,
  }
}

/** Ambil pesan error dari $fetch agar yang tampil ramah (bukan [object Object]) */
export function pesanDariError(e: unknown, fallback: string): string {
  if (typeof e === 'object' && e !== null && 'data' in e) {
    const data = (e as { data?: { statusMessage?: string } }).data
    if (data?.statusMessage) return data.statusMessage
  }
  if (e instanceof Error && e.message) return e.message
  return fallback
}
