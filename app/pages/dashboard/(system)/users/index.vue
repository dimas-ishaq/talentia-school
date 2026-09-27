<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: ['auth', 'role'], roles: ['admin', 'org_admin', 'owner'] })

type UserRow = { id: string; email: string; name: string; role: 'admin' | 'org_admin' | 'owner' | 'teacher' | 'student' | 'parent' }
const { page, search, role, users, meta, pending, error, refresh } = useUsers()
const { confirm } = useConfirm()

const editing = ref<UserRow | null>(null)
const form = reactive({ name: '', email: '', role: 'student' as UserRow['role'], password: '' })
const message = ref('')
const errorMsg = ref('')
const saving = ref(false)
const searchInput = ref('')
let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(searchInput, (val) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    const v = val.trim()
    search.value = v.length >= 3 ? v : ''
  }, 350)
})
onUnmounted(() => clearTimeout(searchTimer))
const searchTooShort = computed(() => searchInput.value.trim().length > 0 && searchInput.value.trim().length < 3)
const visibleRoleCounts = computed(() => users.value.reduce<Record<string, number>>((counts, user) => {
  counts[user.role] = (counts[user.role] ?? 0) + 1
  return counts
}, {}))

function reset() {
  editing.value = null
  Object.assign(form, { name: '', email: '', role: 'student', password: '' })
}
function edit(user: UserRow) {
  editing.value = user
  Object.assign(form, { name: user.name, email: user.email, role: user.role, password: '' })
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
function resetFilters() {
  searchInput.value = ''
  search.value = ''
  role.value = ''
}
async function save() {
  message.value = ''; errorMsg.value = ''; saving.value = true
  try {
    const body = { name: form.name, email: form.email, role: form.role, ...(form.password ? { password: form.password } : {}) }
    await $fetch(editing.value ? `/api/users/${editing.value.id}` : '/api/users', { method: editing.value ? 'PATCH' : 'POST', body })
    await refresh(); message.value = editing.value ? 'Pengguna berhasil diperbarui.' : 'Pengguna berhasil ditambahkan.'; reset()
  } catch (e: unknown) { errorMsg.value = pesanDariError(e, 'Gagal menyimpan pengguna.') }
  finally { saving.value = false }
}
async function remove(user: UserRow) {
  if (!await confirm({ title: 'Hapus pengguna?', message: `Hapus pengguna ${user.name}?`, confirmLabel: 'Ya, hapus', tone: 'danger' })) return
  try { await $fetch(`/api/users/${user.id}`, { method: 'DELETE' }); await refresh(); message.value = 'Pengguna dihapus.' }
  catch (e: unknown) { errorMsg.value = pesanDariError(e, 'Gagal menghapus pengguna.') }
}
async function resetPassword(user: UserRow) {
  if (!await confirm({ title: 'Reset password?', message: `Buat password sementara untuk ${user.name}?`, confirmLabel: 'Ya, reset', tone: 'danger' })) return
  try { const result = await $fetch<{ temporaryPassword: string }>(`/api/users/${user.id}/reset-password`, { method: 'POST' }); message.value = `Password sementara ${user.name}: ${result.temporaryPassword}` }
  catch (e: unknown) { errorMsg.value = pesanDariError(e, 'Gagal reset password.') }
}
const roleLabel = (r: UserRow['role']) => ({ admin: 'Admin Sekolah', org_admin: 'Admin Sekolah', owner: 'Pemilik', teacher: 'Guru', student: 'Siswa', parent: 'Orang Tua' }[r] ?? r)
const roleColor = (r: UserRow['role']) => ({
  admin: 'bg-violet-100 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300',
  org_admin: 'bg-violet-100 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300',
  owner: 'bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300',
  teacher: 'bg-blue-100 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300',
  student: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300',
  parent: 'bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300',
}[r] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300')
const initials = (name: string) => name.split(' ').map(part => part[0]).slice(0, 2).join('').toUpperCase()
</script>

<template>
  <div class="mx-auto max-w-7xl space-y-6 pb-8">
    <section class="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-emerald-50 via-white to-violet-50 px-6 py-7 text-slate-900 shadow-xl shadow-slate-900/10 dark:border-slate-700 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-white sm:px-8">
      <div class="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl" />
      <div class="absolute bottom-0 right-1/4 h-24 w-24 rounded-full bg-violet-500/20 blur-2xl" />
      <div class="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
        <div>
          <div class="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300"><Icon name="heroicons:shield-check" class="h-4 w-4" /> Workspace admin</div>
          <h1 class="text-3xl font-bold tracking-tight sm:text-4xl">Manajemen Pengguna</h1>
          <p class="mt-2 max-w-xl text-sm text-slate-600 dark:text-slate-300">Kelola akses, peran, dan keamanan akun sekolah dari satu tempat.</p>
        </div>
        <a href="/api/users/export" class="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900/5 px-4 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-900/10 transition hover:bg-slate-900/10 dark:bg-white/10 dark:text-white dark:ring-white/20 dark:hover:bg-white/20"><Icon name="heroicons:arrow-down-tray" class="h-4 w-4" /> Export CSV</a>
      </div>
    </section>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"><div class="flex items-center justify-between"><p class="text-xs font-semibold uppercase tracking-wider text-slate-500">Total pengguna</p><span class="rounded-xl bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-400/10"><Icon name="heroicons:users" class="h-5 w-5" /></span></div><p class="mt-3 text-3xl font-bold text-slate-900 dark:text-white">{{ meta?.total ?? 0 }}</p><p class="mt-1 text-xs text-slate-400">Seluruh akun terdaftar</p></div>
      <div v-for="item in [{ key: 'admin', label: 'Admin', icon: 'heroicons:shield-check' }, { key: 'teacher', label: 'Guru', icon: 'heroicons:academic-cap' }, { key: 'student', label: 'Siswa', icon: 'heroicons:book-open' }]" :key="item.key" class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"><div class="flex items-center justify-between"><p class="text-xs font-semibold uppercase tracking-wider text-slate-500">{{ item.label }}</p><span class="rounded-xl bg-slate-100 p-2 text-slate-600 dark:bg-slate-700 dark:text-slate-300"><Icon :name="item.icon" class="h-5 w-5" /></span></div><p class="mt-3 text-3xl font-bold text-slate-900 dark:text-white">{{ visibleRoleCounts[item.key] ?? 0 }}</p><p class="mt-1 text-xs text-slate-400">Pada halaman ini</p></div>
    </div>

    <div v-if="message" class="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300"><span class="flex items-center gap-2"><Icon name="heroicons:check-circle" class="h-5 w-5" />{{ message }}</span><button @click="message = ''"><Icon name="heroicons:x-mark" class="h-4 w-4" /></button></div>
    <div v-if="errorMsg" class="flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"><span>{{ errorMsg }}</span><button @click="errorMsg = ''"><Icon name="heroicons:x-mark" class="h-4 w-4" /></button></div>

    <form class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800" @submit.prevent="save">
      <div class="mb-4 flex items-center justify-between"><div><h2 class="font-semibold text-slate-900 dark:text-white">{{ editing ? 'Edit pengguna' : 'Tambah pengguna' }}</h2><p class="mt-1 text-xs text-slate-500">{{ editing ? 'Perbarui informasi akun terpilih.' : 'Buat akses baru untuk warga sekolah.' }}</p></div><span class="rounded-xl bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-400/10"><Icon :name="editing ? 'heroicons:pencil-square' : 'heroicons:user-plus'" class="h-5 w-5" /></span></div>
      <div class="grid gap-3 md:grid-cols-2 lg:grid-cols-5"><input v-model="form.name" required minlength="2" placeholder="Nama lengkap" class="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-600 dark:bg-slate-700/50 dark:text-white"><input v-model="form.email" required type="email" placeholder="Alamat email" class="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-600 dark:bg-slate-700/50 dark:text-white"><select v-model="form.role" class="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-700/50 dark:text-white"><option value="org_admin">Admin Sekolah</option><option value="teacher">Guru</option><option value="student">Siswa</option><option value="parent">Orang Tua</option></select><input v-model="form.password" :required="!editing" minlength="8" type="password" :placeholder="editing ? 'Password baru (opsional)' : 'Password min. 8 karakter'" class="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-700/50 dark:text-white"><div class="flex gap-2"><button :disabled="saving" class="h-11 flex-1 rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-600 disabled:opacity-50">{{ saving ? 'Menyimpan...' : editing ? 'Simpan perubahan' : 'Tambah pengguna' }}</button><button v-if="editing" type="button" class="rounded-xl border border-slate-200 px-3 text-sm text-slate-600 dark:border-slate-600 dark:text-slate-300" @click="reset">Batal</button></div></div>
    </form>

    <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div class="flex flex-col gap-4 border-b border-slate-100 p-5 dark:border-slate-700 sm:flex-row sm:items-center"><div class="relative flex-1"><Icon name="heroicons:magnifying-glass" class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input v-model="searchInput" type="search" placeholder="Cari nama atau email (min. 3 huruf)..." class="h-11 w-full rounded-xl border bg-slate-50 pl-10 pr-3 text-sm outline-none focus:border-emerald-500 dark:bg-slate-700/50 dark:text-white" :class="searchTooShort ? 'border-amber-400' : 'border-slate-200 dark:border-slate-600'"></div><select v-model="role" class="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm dark:border-slate-600 dark:bg-slate-700/50 dark:text-white sm:w-48"><option value="">Semua role</option><option value="admin">Admin</option><option value="org_admin">Admin Sekolah</option><option value="owner">Pemilik</option><option value="teacher">Guru</option><option value="student">Siswa</option><option value="parent">Orang Tua</option></select><button v-if="searchInput || role" class="text-sm font-semibold text-emerald-600 hover:text-emerald-700" @click="resetFilters">Reset</button></div>
      <p v-if="searchTooShort" class="px-5 pt-3 text-xs text-amber-600">Ketik minimal 3 huruf untuk mulai mencari.</p>
      <div v-if="pending" class="p-12 text-center text-sm text-slate-500">Memuat data...</div><div v-else-if="error" class="p-12 text-center text-sm text-red-600">Gagal memuat data. <button class="underline" @click="refresh()">Coba lagi</button></div><div v-else class="overflow-x-auto"><table class="w-full text-sm"><thead class="bg-slate-50/80 dark:bg-slate-700/30"><tr><th class="w-16 px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">No</th><th class="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Pengguna</th><th class="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Role</th><th class="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Aksi</th></tr></thead><tbody><tr v-for="(user, i) in users" :key="user.id" class="border-t border-slate-100 transition hover:bg-emerald-50/30 dark:border-slate-700 dark:hover:bg-slate-700/30"><td class="px-5 py-4 text-slate-400">{{ (meta ? (meta.page - 1) * meta.perPage : 0) + i + 1 }}</td><td class="px-5 py-4"><div class="flex items-center gap-3"><div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-xs font-bold text-white">{{ initials(user.name) }}</div><div><p class="font-semibold text-slate-800 dark:text-white">{{ user.name }}</p><p class="mt-0.5 text-xs text-slate-500">{{ user.email }}</p></div></div></td><td class="px-5 py-4"><span class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold" :class="roleColor(user.role)">{{ roleLabel(user.role) }}</span></td><td class="px-5 py-4 text-right whitespace-nowrap"><button class="mr-3 text-xs font-semibold text-blue-600 hover:text-blue-800" @click="edit(user)">Edit</button><button class="mr-3 text-xs font-semibold text-amber-600 hover:text-amber-800" @click="resetPassword(user)">Reset PW</button><button class="text-xs font-semibold text-red-600 hover:text-red-800" @click="remove(user)">Hapus</button></td></tr><tr v-if="!users.length"><td colspan="4" class="p-12 text-center text-slate-500">Tidak ada pengguna yang cocok.</td></tr></tbody></table></div>
      <div v-if="meta && meta.totalPages > 1" class="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700 dark:bg-slate-700/20"><p class="text-xs text-slate-500">Menampilkan <b class="text-slate-700 dark:text-slate-300">{{ (meta.page - 1) * meta.perPage + 1 }}–{{ Math.min(meta.page * meta.perPage, meta.total) }}</b> dari <b class="text-slate-700 dark:text-slate-300">{{ meta.total }}</b> pengguna</p><div class="flex items-center gap-2"><button :disabled="meta.page <= 1" class="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 disabled:opacity-40 dark:border-slate-600 dark:text-slate-300" @click="page = meta!.page - 1">Sebelumnya</button><span class="text-xs text-slate-500">{{ meta.page }} / {{ meta.totalPages }}</span><button :disabled="meta.page >= meta.totalPages" class="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 disabled:opacity-40 dark:border-slate-600 dark:text-slate-300" @click="page = meta!.page + 1">Berikutnya</button></div></div>
    </section>
  </div>
</template>