// app/composables/useCategories.ts
import type { CategoryRow } from '~/types/categories'
import { pesanDariError } from './useStudents'

export function useCategories() {
  const { data, pending, error, refresh } = useFetch<{ data: CategoryRow[] }>('/api/categories')

  const categories = computed<CategoryRow[]>(() => data.value?.data ?? [])

  // Build tree for display
  interface TreeNode extends CategoryRow {
    children: TreeNode[]
  }
  const tree = computed<TreeNode[]>(() => {
    const map = new Map<string, TreeNode>()
    for (const c of categories.value) map.set(c.id, { ...c, children: [] })
    const roots: TreeNode[] = []
    for (const node of map.values()) {
      if (node.parentId && map.has(node.parentId)) {
        map.get(node.parentId)!.children.push(node)
      } else {
        roots.push(node)
      }
    }
    roots.sort((a, b) => a.position - b.position)
    for (const node of map.values()) {
      node.children.sort((a, b) => a.position - b.position)
    }
    return roots
  })

  // Toast
  const pesanSukses = ref('')
  const pesanError = ref('')
  function tutupToast() { pesanSukses.value = ''; pesanError.value = '' }

  // Delete
  const dihapus = ref<CategoryRow | null>(null)
  const isDeleting = ref(false)
  function mintaHapus(cat: CategoryRow) { tutupToast(); dihapus.value = cat }
  function batalHapus() { dihapus.value = null }
  async function konfirmasiHapus() {
    if (!dihapus.value || isDeleting.value) return
    isDeleting.value = true
    try {
      await $fetch(`/api/categories/${dihapus.value.id}`, { method: 'DELETE' })
      dihapus.value = null
      await refresh()
      pesanSukses.value = 'Kategori berhasil dihapus.'
    } catch (e: unknown) {
      pesanError.value = pesanDariError(e, 'Gagal menghapus kategori')
    } finally { isDeleting.value = false }
  }

  // Toggle visible
  const togglingId = ref<string | null>(null)
  async function toggleVisible(cat: CategoryRow) {
    if (togglingId.value) return
    togglingId.value = cat.id
    try {
      await $fetch(`/api/categories/${cat.id}`, {
        method: 'PATCH',
        body: { isVisible: !cat.isVisible },
      })
      await refresh()
      pesanSukses.value = cat.isVisible ? 'Kategori disembunyikan.' : 'Kategori ditampilkan.'
    } catch (e: unknown) {
      pesanError.value = pesanDariError(e, 'Gagal mengubah visibilitas')
    } finally { togglingId.value = null }
  }

  // Reorder (swap position with sibling)
  async function reorder(cat: CategoryRow, dir: 'up' | 'down') {
    const siblings = categories.value
      .filter((c) => c.parentId === cat.parentId)
      .sort((a, b) => a.position - b.position)
    const idx = siblings.findIndex((c) => c.id === cat.id)
    if (idx < 0) return
    const neighbor = dir === 'up' ? siblings[idx - 1] : siblings[idx + 1]
    if (!neighbor) return
    try {
      await $fetch(`/api/categories/${cat.id}`, { method: 'PATCH', body: { position: neighbor.position } })
      await $fetch(`/api/categories/${neighbor.id}`, { method: 'PATCH', body: { position: cat.position } })
      await refresh()
    } catch (e: unknown) {
      pesanError.value = pesanDariError(e, 'Gagal mengubah urutan')
    }
  }

  // Drag & drop: simpan urutan baru untuk sekelompok sibling (indeks = position)
  const savingOrder = ref(false)
  async function saveOrder(ordered: CategoryRow[]) {
    if (savingOrder.value) return
    savingOrder.value = true
    try {
      await Promise.all(
        ordered.map((cat, index) =>
          cat.position === index
            ? Promise.resolve()
            : $fetch(`/api/categories/${cat.id}`, { method: 'PATCH', body: { position: index } }),
        ),
      )
      await refresh()
      pesanSukses.value = 'Urutan kategori diperbarui.'
    } catch (e: unknown) {
      pesanError.value = pesanDariError(e, 'Gagal mengubah urutan')
      await refresh()
    } finally {
      savingOrder.value = false
    }
  }

  return {
    categories, tree, pending, error, refresh,
    pesanSukses, pesanError, tutupToast,
    dihapus, isDeleting, mintaHapus, batalHapus, konfirmasiHapus,
    togglingId, toggleVisible, reorder,
    savingOrder, saveOrder,
  }
}