<!-- app/components/features/teachers/AdminTeacherFormView.vue -->
<script setup lang="ts">
import type { TeacherFormPayload } from "~/types/teachers";
import type { FetchError } from "ofetch";

const props = defineProps<{
  teacherId?: string; // Jika ada → mode edit
}>();

const isEditing = computed(() => !!props.teacherId);

// ===== Form state =====
const form = reactive({
  name: "",
  email: "",
  password: "",
  code: "",
  nip: "",
  phone: "",
  address: "",
  subject: "",
});

const isSubmitting = ref(false);
const errorMessage = ref("");
const showPassword = ref(false);
const isFetchingEdit = ref(!!props.teacherId);

// ===== Jika edit, fetch data lama =====
onMounted(async () => {
  if (!props.teacherId) return;
  try {
    const res = await $fetch(`/api/teachers/${props.teacherId}`);
    const data = (res as any).data;
    form.name = data.name ?? "";
    form.email = data.email ?? "";
    form.code = data.code ?? "";
    form.nip = data.nip ?? "";
    form.phone = data.phone ?? "";
    form.address = data.address ?? "";
    form.subject = data.subject ?? "";
  } catch {
    errorMessage.value = "Gagal memuat data guru";
  } finally {
    isFetchingEdit.value = false;
  }
});

// ===== Validasi =====
const errors = computed(() => {
  const e: Record<string, string> = {};
  if (!form.name.trim()) e.name = "Nama wajib diisi";
  if (!form.nip.trim()) e.nip = "NIP wajib diisi";
  if (!isEditing.value) {
    if (!form.email.trim()) e.email = "Email wajib diisi";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Format email tidak valid";
    if (!form.password) e.password = "Password wajib diisi";
    else if (form.password.length < 6)
      e.password = "Password minimal 6 karakter";
  }
  return e;
});

const isValid = computed(() => Object.keys(errors.value).length === 0);

// ===== Submit =====
async function handleSubmit() {
  errorMessage.value = "";
  if (!isValid.value) {
    errorMessage.value = "Mohon lengkapi form dengan benar";
    return;
  }

  isSubmitting.value = true;
  try {
    const body: TeacherFormPayload = {
      name: form.name.trim(),
      email: form.email.trim(),
      code: form.code.trim() || undefined,
      nip: form.nip.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      subject: form.subject.trim(),
    };

    if (isEditing.value) {
      await $fetch(`/api/teachers/${props.teacherId}`, {
        method: "PATCH",
        body,
      });
      await navigateTo("/dashboard/teachers?updated=1");
    } else {
      body.password = form.password;
      await $fetch("/api/teachers", { method: "POST", body });
      await navigateTo("/dashboard/teachers?created=1");
    }
  } catch (e: any) {
    errorMessage.value =
      (e as FetchError).data?.statusMessage ?? "Gagal menyimpan data guru";
  } finally {
    isSubmitting.value = false;
  }
}

function handleCancel() {
  navigateTo("/dashboard/teachers");
}
</script>

<template>
  <div class="mx-auto max-w-6xl space-y-6 pb-8">
    <section class="relative overflow-hidden rounded-3xl bg-slate-950 px-6 py-7 text-white shadow-xl shadow-slate-900/10 sm:px-8">
      <div class="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-violet-400/20 blur-3xl" />
      <div class="relative flex items-center gap-4">
        <NuxtLink to="/dashboard/teachers" class="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white transition hover:bg-white/20"><Icon name="heroicons:arrow-left" class="h-5 w-5" /></NuxtLink>
        <div><div class="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-violet-300"><Icon name="heroicons:academic-cap" class="h-4 w-4" /> Data master</div><h1 class="text-3xl font-bold tracking-tight">{{ isEditing ? "Edit Guru" : "Tambah Guru" }}</h1><p class="mt-1 text-sm text-slate-300">{{ isEditing ? "Perbarui data guru" : "Akun login akan dibuat otomatis" }}</p></div>
      </div>
    </section>

    <!-- Loading edit -->
    <div
      v-if="isFetchingEdit"
      class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center"
    >
      <div
        class="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"
      />
      <p class="mt-3 text-sm text-slate-500 dark:text-slate-400">Memuat data guru...</p>
    </div>

    <template v-else>
      <!-- Error -->
      <div
        v-if="errorMessage"
        class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-300"
      >
        {{ errorMessage }}
      </div>

      <form @submit.prevent="handleSubmit">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <!-- ===== FORM (2/3) ===== -->
          <div class="lg:col-span-2 space-y-5">
            <!-- Data Akun -->
            <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5 dark:border-slate-700 dark:bg-slate-800">
              <h2
                class="font-semibold text-slate-800 dark:text-slate-100 pb-3 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2"
              >
                <Icon name="heroicons:lock-closed" class="w-4 h-4" />
                <span>Data Akun</span>
              </h2>

              <!-- Nama & Kode Guru -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Nama Lengkap <span class="text-red-500">*</span>
                  </label>
                  <input
                    v-model="form.name"
                    type="text"
                    placeholder="Dr. Ahmad Fauzi, M.Pd."
                    class="w-full h-10 px-3.5 text-sm rounded-lg border bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    :class="errors.name ? 'border-red-300 dark:border-red-700' : 'border-slate-200 dark:border-slate-600'"
                  />
                  <p v-if="errors.name" class="mt-1.5 text-xs text-red-600 dark:text-red-400">
                    {{ errors.name }}
                  </p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Kode Guru</label>
                  <input
                    v-model="form.code"
                    type="text"
                    placeholder="G001"
                    class="w-full h-10 px-3.5 text-sm font-mono uppercase rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                  <p class="mt-1.5 text-xs text-slate-400">Opsional, harus unik.</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    NIP <span class="text-red-500">*</span>
                  </label>
                  <input
                    v-model="form.nip"
                    type="text"
                    placeholder="196501011990011001"
                    class="w-full h-10 px-3.5 text-sm font-mono rounded-lg border bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    :class="errors.nip ? 'border-red-300 dark:border-red-700' : 'border-slate-200 dark:border-slate-600'"
                  />
                  <p v-if="errors.nip" class="mt-1.5 text-xs text-red-600 dark:text-red-400">
                    {{ errors.nip }}
                  </p>
                </div>
              </div>

              <!-- Email & Password (hanya saat create) -->
              <div
                v-if="!isEditing"
                class="grid grid-cols-1 sm:grid-cols-2 gap-5"
              >
                <div>
                  <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Email <span class="text-red-500">*</span>
                  </label>
                  <input
                    v-model="form.email"
                    type="email"
                    placeholder="guru@sekolah.id"
                    class="w-full h-10 px-3.5 text-sm rounded-lg border bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    :class="
                      errors.email ? 'border-red-300 dark:border-red-700' : 'border-slate-200 dark:border-slate-600'
                    "
                  />
                  <p v-if="errors.email" class="mt-1.5 text-xs text-red-600 dark:text-red-400">
                    {{ errors.email }}
                  </p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Password <span class="text-red-500">*</span>
                  </label>
                  <div class="relative">
                    <input
                      v-model="form.password"
                      :type="showPassword ? 'text' : 'password'"
                      placeholder="Minimal 6 karakter"
                      class="w-full h-10 pl-3.5 pr-11 text-sm rounded-lg border bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      :class="
                        errors.password
                          ? 'border-red-300 dark:border-red-700'
                          : 'border-slate-200 dark:border-slate-600'
                      "
                    />
                    <button
                      type="button"
                      class="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 inline-flex items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                      @click="showPassword = !showPassword"
                    >
                      <Icon
                        :name="
                          showPassword
                            ? 'heroicons:eye-slash'
                            : 'heroicons:eye'
                        "
                        class="w-4 h-4"
                      />
                    </button>
                  </div>
                  <p
                    v-if="errors.password"
                    class="mt-1.5 text-xs text-red-600 dark:text-red-400"
                  >
                    {{ errors.password }}
                  </p>
                </div>
              </div>
              <!-- Email readonly saat edit -->
              <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Email
                  </label>
                  <input
                    :value="form.email"
                    type="email"
                    readonly
                    class="w-full h-10 px-3.5 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                  />
                  <p class="mt-1.5 text-xs text-slate-400">
                    Email tidak dapat diubah
                  </p>
                </div>
              </div>
            </div>

            <!-- Data Guru -->
            <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5 dark:border-slate-700 dark:bg-slate-800">
              <h2
                class="font-semibold text-slate-800 dark:text-slate-100 pb-3 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2"
              >
                <Icon name="heroicons:academic-cap" class="w-4 h-4" />
                <span>Data Guru</span>
              </h2>

              <!-- Mapel & Telepon -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Mata Pelajaran
                  </label>
                  <input
                    v-model="form.subject"
                    type="text"
                    placeholder="Matematika"
                    class="w-full h-10 px-3.5 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    No. Telepon
                  </label>
                  <input
                    v-model="form.phone"
                    type="tel"
                    placeholder="08xxxxxxxxxx"
                    class="w-full h-10 px-3.5 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
              </div>

              <!-- Alamat -->
              <div>
                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Alamat
                </label>
                <textarea
                  v-model="form.address"
                  rows="3"
                  placeholder="Alamat lengkap guru"
                  class="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                />
              </div>
            </div>

            <!-- Tombol Aksi (desktop) -->
            <div class="hidden lg:flex items-center justify-end gap-2">
              <button
                type="button"
                class="h-10 px-4 text-sm font-medium text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                :disabled="isSubmitting"
                @click="handleCancel"
              >
                Batal
              </button>
              <button
                type="submit"
                :disabled="isSubmitting || !isValid"
                class="h-10 px-5 text-sm font-semibold text-white rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ isSubmitting ? "Menyimpan..." : isEditing ? "Update" : "Simpan" }}
              </button>
            </div>
          </div>

          <!-- ===== PREVIEW (1/3) ===== -->
          <div class="space-y-5">
            <div
              class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden lg:sticky lg:top-4"
            >
              <div
                class="bg-gradient-to-br from-purple-500 to-purple-600 px-5 py-6 text-white"
              >
                <p class="text-xs uppercase tracking-wider opacity-80 mb-3">
                  Preview
                </p>
                <div class="flex items-center gap-3">
                  <div
                    class="w-14 h-14 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-2xl font-bold shrink-0"
                  >
                    {{ form.name?.charAt(0).toUpperCase() || "?" }}
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="font-semibold truncate">
                      {{ form.name || "Nama Guru" }}
                    </p>
                    <p class="text-xs opacity-80 font-mono uppercase">
                      {{ form.code ? `${form.code} · ` : "" }}{{ form.nip || "NIP belum diisi" }}
                    </p>
                  </div>
                </div>
              </div>
              <div class="p-5 space-y-4 text-sm">
                <div class="flex items-start justify-between gap-3">
                  <span class="text-slate-500 dark:text-slate-400 text-xs">Kode</span>
                  <span class="text-slate-800 dark:text-slate-200 font-mono text-right">
                    {{ form.code || "-" }}
                  </span>
                </div>
                <div class="flex items-start justify-between gap-3">
                  <span class="text-slate-500 dark:text-slate-400 text-xs">Mapel</span>
                  <span class="text-slate-800 dark:text-slate-200 font-medium text-right">
                    {{ form.subject || "-" }}
                  </span>
                </div>
                <div class="flex items-start justify-between gap-3">
                  <span class="text-slate-500 dark:text-slate-400 text-xs">Email</span>
                  <span class="text-slate-800 dark:text-slate-200 text-right break-all text-xs font-mono">
                    {{ form.email || "-" }}
                  </span>
                </div>
                <div class="flex items-start justify-between gap-3">
                  <span class="text-slate-500 dark:text-slate-400 text-xs">Telepon</span>
                  <span class="text-slate-800 dark:text-slate-200 text-xs">
                    {{ form.phone || "-" }}
                  </span>
                </div>
                <div class="flex items-start justify-between gap-3">
                  <span class="text-slate-500 dark:text-slate-400 text-xs">Alamat</span>
                  <span class="text-slate-800 dark:text-slate-200 text-xs text-right">
                    {{ form.address || "-" }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Tombol Aksi (mobile) -->
            <div class="lg:hidden flex items-center justify-end gap-2">
              <button
                type="button"
                class="h-10 px-4 text-sm font-medium text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                :disabled="isSubmitting"
                @click="handleCancel"
              >
                Batal
              </button>
              <button
                type="submit"
                :disabled="isSubmitting || !isValid"
                class="h-10 px-5 text-sm font-semibold text-white rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ isSubmitting ? "Menyimpan..." : isEditing ? "Update" : "Simpan" }}
              </button>
            </div>
          </div>
        </div>
      </form>
    </template>
  </div>
</template>