<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: ['auth', 'role'], roles: ['admin', 'org_admin', 'owner'] })

type Organization = { id: string; name: string; slug: string; status: string; role: string }
type Member = { userId: string; name: string; email: string; role: string; status: string }
type Invite = { email: string; role: string; expiresAt: string }

const { data, refresh } = await useFetch<{ data: Organization }>('/api/organizations/me')
const { data: people, refresh: refreshPeople } = await useFetch<{ data: { members: Member[]; invites: Invite[] } }>('/api/organizations/members')

const name = ref('')
const saving = ref(false)
const message = ref('')
const error = ref('')
watch(data, value => { name.value = value?.data?.name ?? '' }, { immediate: true })

async function save() {
  saving.value = true; message.value = ''; error.value = ''
  try {
    await $fetch('/api/organizations/me', { method: 'PATCH', body: { name: name.value } })
    await refresh(); message.value = 'Nama sekolah berhasil disimpan.'
  } catch (e: any) { error.value = e?.data?.statusMessage || 'Gagal menyimpan nama sekolah.' }
  finally { saving.value = false }
}

const invite = reactive({ email: '', role: 'teacher' })
const inviting = ref(false)
const inviteMessage = ref('')
const inviteError = ref('')
const inviteUrl = ref('')
async function sendInvite() {
  inviting.value = true; inviteMessage.value = ''; inviteError.value = ''; inviteUrl.value = ''
  try {
    const result = await $fetch<{ inviteUrl: string }>('/api/organizations/invites', { method: 'POST', body: { email: invite.email, role: invite.role } })
    inviteUrl.value = result.inviteUrl
    inviteMessage.value = `Undangan dibuat untuk ${invite.email}.`
    invite.email = ''
    await refreshPeople()
  } catch (e: any) { inviteError.value = e?.data?.statusMessage || 'Gagal membuat undangan.' }
  finally { inviting.value = false }
}

const roleLabel = (r: string) => ({ owner: 'Pemilik', org_admin: 'Admin Sekolah', admin: 'Owner Sekolah', teacher: 'Guru', student: 'Siswa', parent: 'Orang Tua' }[r] ?? r)
</script>

<template>
  <div class="max-w-4xl space-y-5">
    <header>
      <h1 class="text-2xl font-bold text-slate-800 dark:text-slate-100">Sekolah Saya</h1>
      <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Kelola identitas organisasi dan anggotanya.</p>
    </header>
    <div v-if="message" class="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{{ message }}</div>
    <div v-if="error" class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{{ error }}</div>

    <section class="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
      <h2 class="font-semibold text-slate-800 dark:text-slate-100">Identitas sekolah</h2>
      <div class="mt-4 grid gap-4 sm:grid-cols-2">
        <label class="text-sm font-medium text-slate-700 dark:text-slate-200">Nama sekolah
          <input v-model="name" maxlength="120" class="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 dark:border-slate-600 dark:bg-slate-800">
        </label>
        <div class="text-sm"><span class="font-medium text-slate-700 dark:text-slate-200">Status</span><p class="mt-2 capitalize text-slate-500">{{ data?.data?.status }}</p></div>
        <div class="text-sm"><span class="font-medium text-slate-700 dark:text-slate-200">Slug</span><p class="mt-2 text-slate-500">{{ data?.data?.slug }}</p></div>
        <div class="text-sm"><span class="font-medium text-slate-700 dark:text-slate-200">Peran Anda</span><p class="mt-2 text-slate-500">{{ roleLabel(data?.data?.role ?? '') }}</p></div>
      </div>
      <button :disabled="saving" class="mt-5 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" @click="save">{{ saving ? 'Menyimpan...' : 'Simpan perubahan' }}</button>
    </section>

    <section class="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
      <h2 class="font-semibold text-slate-800 dark:text-slate-100">Undang anggota</h2>
      <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Buat tautan undangan untuk guru, siswa, atau admin lain.</p>
      <div v-if="inviteMessage" class="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{{ inviteMessage }}</div>
      <div v-if="inviteError" class="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{{ inviteError }}</div>
      <div v-if="inviteUrl" class="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-600 dark:bg-slate-900">
        <p class="text-slate-500">Tautan undangan (kirim manual ke email tujuan):</p>
        <code class="mt-1 block break-all text-emerald-700 dark:text-emerald-400">{{ inviteUrl }}</code>
      </div>
      <div class="mt-4 flex flex-wrap gap-3">
        <input v-model="invite.email" type="email" placeholder="email@sekolah.com" class="h-10 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800">
        <select v-model="invite.role" class="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800">
          <option value="org_admin">Admin Sekolah</option>
          <option value="teacher">Guru</option>
          <option value="student">Siswa</option>
          <option value="parent">Orang Tua</option>
        </select>
        <button :disabled="inviting || !invite.email" class="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" @click="sendInvite">{{ inviting ? 'Membuat...' : 'Undang' }}</button>
      </div>
    </section>

    <section class="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
      <h2 class="border-b border-slate-200 px-5 py-4 font-semibold text-slate-800 dark:border-slate-700 dark:text-slate-100">Anggota ({{ people?.data?.members.length ?? 0 }})</h2>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-700/40">
            <tr><th class="p-3">Nama</th><th class="p-3">Email</th><th class="p-3">Peran</th><th class="p-3">Status</th></tr>
          </thead>
          <tbody>
            <tr v-for="m in people?.data?.members ?? []" :key="m.userId" class="border-t border-slate-100 dark:border-slate-700">
              <td class="p-3 font-medium text-slate-700 dark:text-slate-200">{{ m.name }}</td>
              <td class="p-3 text-slate-500">{{ m.email }}</td>
              <td class="p-3 text-slate-500">{{ roleLabel(m.role) }}</td>
              <td class="p-3 capitalize text-slate-500">{{ m.status }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="people?.data?.invites.length" class="border-t border-slate-200 px-5 py-4 dark:border-slate-700">
        <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-200">Undangan menunggu</h3>
        <ul class="mt-2 space-y-1 text-sm text-slate-500">
          <li v-for="i in people.data.invites" :key="i.email">{{ i.email }} — {{ roleLabel(i.role) }}</li>
        </ul>
      </div>
    </section>
  </div>
</template>
