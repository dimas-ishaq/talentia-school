<!-- app/components/features/classes/ClassesFormModal.vue -->
<script setup lang="ts">
import type {
  ClassRow,
  ClassFormPayload,
  TeacherOption,
} from "~/types/classes";
import type { FetchError } from "ofetch";

const props = defineProps<{
  editingClass: ClassRow | null;
  teachers: TeacherOption[];
}>();

const emit = defineEmits<{
  close: [];
  saved: [];
}>();

// ===== Formulario (reinicido cada vez abierto via v-if) =====
const form = reactive({
  name: props.editingClass?.name ?? "",
  level: (props.editingClass?.level ?? "") as string | number,
  teacherId: props.editingClass?.teacherId ?? "",
});

const isEditing = computed(() => props.editingClass !== null);

// ===== Validasi =====
const errors = computed(() => {
  const e: Record<string, string> = {};
  if (!form.name.trim()) e.name = "Nama kelas wajib diisi";
  const levelNum = Number(form.level);
  if (!form.level) e.level = "Level wajib diisi";
  else if (isNaN(levelNum) || levelNum < 1 || levelNum > 12)
    e.level = "Level harus 1–12";
  return e;
});

const isValid = computed(() => Object.keys(errors.value).length === 0);

// ===== Submit =====
const isSubmitting = ref(false);
const errorMessage = ref("");

async function handleSubmit() {
  errorMessage.value = "";
  if (!isValid.value) return;

  isSubmitting.value = true;
  try {
    const body: ClassFormPayload = {
      name: form.name.trim(),
      level: Number(form.level),
      teacherId: form.teacherId || null,
    };

    if (props.editingClass) {
      await $fetch(`/api/classes/${props.editingClass.id}`, {
        method: "PATCH",
        body,
      });
    } else {
      await $fetch("/api/classes", { method: "POST", body });
    }
    emit("saved");
  } catch (e) {
    errorMessage.value = (e as FetchError).data?.statusMessage ?? "Gagal menyimpan data";
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      @click.self="$emit('close')"
    >
      <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md">
        <!-- Header -->
        <div
          class="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700"
        >
          <h2 class="text-lg font-bold text-slate-800 dark:text-slate-100">
            {{ isEditing ? "Edit Kelas" : "Tambah Kelas" }}
          </h2>
          <button
            class="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
            @click="$emit('close')"
          >
            <Icon name="heroicons:x-mark" class="w-5 h-5" />
          </button>
        </div>

        <!-- Body -->
        <form @submit.prevent="handleSubmit">
          <div class="px-5 py-4 space-y-5">
            <!-- Error -->
            <div
              v-if="errorMessage"
              class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-xs text-red-700 dark:text-red-300"
            >
              {{ errorMessage }}
            </div>

            <!-- Nama Kelas -->
            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Nama Kelas <span class="text-red-500">*</span>
              </label>
              <input
                v-model="form.name"
                type="text"
                placeholder="Contoh: X IPA 1"
                class="w-full h-10 px-3.5 text-sm rounded-lg border bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                :class="errors.name ? 'border-red-300 dark:border-red-700' : 'border-slate-200 dark:border-slate-600'"
              >
              <p v-if="errors.name" class="mt-1.5 text-xs text-red-600 dark:text-red-400">
                {{ errors.name }}
              </p>
            </div>

            <!-- Level -->
            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Level <span class="text-red-500">*</span>
              </label>
              <select
                v-model="form.level"
                class="w-full h-10 px-3.5 text-sm rounded-lg border bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                :class="errors.level ? 'border-red-300 dark:border-red-700' : 'border-slate-200 dark:border-slate-600'"
              >
                <option value="">Pilih level</option>
                <option v-for="n in 12" :key="n" :value="n">
                  Level {{ n }}
                </option>
              </select>
              <p v-if="errors.level" class="mt-1.5 text-xs text-red-600 dark:text-red-400">
                {{ errors.level }}
              </p>
              <p v-else class="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
                Contoh: 7 untuk kelas 7, 10 untuk kelas 10
              </p>
            </div>

            <!-- Wali Kelas -->
            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Wali Kelas
              </label>
              <select
                v-model="form.teacherId"
                class="w-full h-10 px-3.5 text-sm rounded-lg border bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="">Belum ditentukan</option>
                <option v-for="t in teachers" :key="t.id" :value="t.id">
                  {{ t.name }}{{ t.nip ? ` (${t.nip})` : "" }}
                </option>
              </select>
              <p
                v-if="teachers.length === 0"
                class="mt-1.5 text-xs text-amber-600 dark:text-amber-400"
              >
                Belum ada guru terdaftar
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div
            class="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/80"
          >
            <button
              type="button"
              class="h-10 px-4 text-sm font-medium text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              @click="$emit('close')"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="isSubmitting || !isValid"
              class="h-10 px-5 text-sm font-semibold text-white rounded-lg bg-emerald-500 hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{
                isSubmitting
                  ? "Menyimpan..."
                  : isEditing
                    ? "Update"
                    : "Simpan"
              }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>