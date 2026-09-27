<!-- app/pages/index.vue -->
<script setup lang="ts">
definePageMeta({ layout: false });

const features = [
  {
    icon: "heroicons:clipboard-document-check",
    title: "Absensi Digital",
    description:
      "Guru input absensi dalam hitungan detik. Orang tua langsung tahu kehadiran anak.",
  },
  {
    icon: "heroicons:pencil-square",
    title: "Nilai Otomatis",
    description:
      "Nilai tugas, UTS, dan UAS tercatat rapi. Rata-rata dihitung otomatis.",
  },
  {
    icon: "heroicons:megaphone",
    title: "Pengumuman Terpusat",
    description:
      "Info sekolah tidak lagi hilang di grup WhatsApp. Semua di satu tempat.",
  },
  {
    icon: "heroicons:book-open",
    title: "Materi Pembelajaran",
    description:
      "Guru upload materi, siswa akses kapan saja. Video, PDF, atau teks.",
  },
  {
    icon: "heroicons:beaker",
    title: "Ujian Online (CBT)",
    description:
      "Ujian berbasis komputer dengan auto-save, timer, dan anti-cheating.",
  },
  {
    icon: "heroicons:arrow-trending-up",
    title: "Progress Tracking",
    description: "Pantau perkembangan belajar siswa per materi dan per mapel.",
  },
];

const steps = [
  {
    number: "01",
    title: "Daftar Akun",
    description: "Admin sekolah mendaftar dan mengundang guru serta orang tua.",
  },
  {
    number: "02",
    title: "Setup Kelas",
    description:
      "Tambah kelas, siswa, dan guru. Import dari Excel atau input manual.",
  },
  {
    number: "03",
    title: "Mulai Pakai",
    description:
      "Guru input absensi & nilai. Orang tua pantau dari HP masing-masing.",
  },
];

const testimonials = [
  {
    name: "Bu Ani",
    role: "Guru Kelas 6A",
    avatar: "heroicons:academic-cap",
    text: "Dulu saya input absensi manual, sekarang cuma 1 menit selesai. Orang tua juga langsung tahu.",
  },
  {
    name: "Pak Budi",
    role: "Orang Tua Siswa",
    avatar: "heroicons:user",
    text: "Akhirnya bisa pantau nilai anak tanpa harus nunggu raport. Semua ada di HP.",
  },
  {
    name: "Ibu Citra",
    role: "Kepala Sekolah",
    avatar: "heroicons:briefcase",
    text: "Rekap data siswa dan laporan jadi jauh lebih mudah. Tidak perlu buka banyak file Excel.",
  },
];
</script>

<template>
  <div class="min-h-screen bg-white">
    <!-- Navbar -->
    <nav class="border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur sm:px-6">
      <div class="mx-auto flex max-w-7xl items-center justify-between">
        <NuxtLink to="/" class="flex items-center gap-2" aria-label="Talentia School">
          <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm shadow-emerald-500/30">
            <Icon name="heroicons:academic-cap" class="h-5 w-5" />
          </span>
          <span class="text-lg font-bold tracking-tight text-slate-900">Talentia <span class="text-emerald-600">School</span></span>
        </NuxtLink>
        <div class="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex">
          <a href="#fitur" class="hover:text-emerald-600">Fitur</a>
          <a href="#cara-kerja" class="hover:text-emerald-600">Cara Kerja</a>
          <NuxtLink to="/auth/login" class="hover:text-emerald-600">Masuk</NuxtLink>
          <NuxtLink to="/auth/register" class="rounded-lg bg-emerald-500 px-4 py-2 text-white shadow-sm shadow-emerald-500/20 hover:bg-emerald-600">Mulai Gratis</NuxtLink>
        </div>
      </div>
    </nav>


    <!-- ============ HERO ============ -->
    <section
      class="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-blue-50"
    >
      <!-- Dekorasi background -->
      <div
        class="absolute top-20 -left-20 w-72 h-72 bg-emerald-200 rounded-full blur-3xl opacity-30"
      />
      <div
        class="absolute bottom-0 -right-20 w-96 h-96 bg-blue-200 rounded-full blur-3xl opacity-30"
      />

      <div
        class="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-32"
      >
        <div class="grid lg:grid-cols-2 gap-12 items-center">
          <!-- Kiri: Teks -->
          <div>
            <span
              class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium"
            >
              <Icon name="heroicons:sparkles" class="h-4 w-4" /> Talentia School · solusi belajar terpadu
            </span>

            <h1
              class="mt-6 text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 leading-tight"
            >
              Platform pembelajaran dari <span class="text-emerald-500">Talentia</span> untuk sekolah modern
            </h1>

            <p class="mt-6 text-lg text-slate-600 leading-relaxed max-w-lg">
              <strong class="font-semibold text-slate-900">Talentia School</strong> adalah sub-brand
              pembelajaran dari Talentia. Absensi, nilai, pengumuman, dan ujian
              online dalam satu platform.
            </p>

            <div class="mt-8 flex flex-wrap gap-3">
              <NuxtLink
                to="/auth/register"
                class="px-6 py-3 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/30"
              >
                Coba Gratis
              </NuxtLink>
              <NuxtLink
                to="/auth/login"
                class="px-6 py-3 rounded-xl bg-white text-slate-700 font-semibold border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                Masuk <Icon name="heroicons:arrow-right" class="inline h-4 w-4" />
              </NuxtLink>
            </div>

            <!-- Stats -->
            <div class="mt-12 grid grid-cols-3 gap-6 max-w-md">
              <div>
                <div class="text-2xl font-bold text-slate-900">1.000+</div>
                <div class="text-sm text-slate-500 mt-1">Siswa Aktif</div>
              </div>
              <div>
                <div class="text-2xl font-bold text-slate-900">80+</div>
                <div class="text-sm text-slate-500 mt-1">Guru Terbantu</div>
              </div>
              <div>
                <div class="text-2xl font-bold text-slate-900">99%</div>
                <div class="text-sm text-slate-500 mt-1">Kepuasan</div>
              </div>
            </div>
          </div>

          <!-- Kanan: Mockup -->
          <div class="relative">
            <div
              class="relative bg-white rounded-2xl shadow-2xl p-6 border border-slate-100"
            >
              <!-- Fake browser bar -->
              <div class="flex gap-1.5 mb-4">
                <div class="w-3 h-3 rounded-full bg-red-400" />
                <div class="w-3 h-3 rounded-full bg-yellow-400" />
                <div class="w-3 h-3 rounded-full bg-emerald-400" />
              </div>

              <!-- Fake dashboard -->
              <div class="space-y-3">
                <div class="h-6 bg-slate-100 rounded w-1/3" />
                <div class="grid grid-cols-3 gap-2">
                  <div class="h-16 bg-emerald-100 rounded-lg" />
                  <div class="h-16 bg-blue-100 rounded-lg" />
                  <div class="h-16 bg-amber-100 rounded-lg" />
                </div>
                <div class="h-32 bg-slate-50 rounded-lg" />
                <div class="h-6 bg-slate-100 rounded w-2/3" />
                <div class="h-6 bg-slate-100 rounded w-1/2" />
              </div>
            </div>

            <!-- Floating badge -->
            <div
              class="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-lg p-3 flex items-center gap-2 border border-slate-100"
            >
              <span class="text-2xl"><Icon name="heroicons:check-circle" class="h-6 w-6 text-emerald-500" /></span>
              <div>
                <div class="text-xs text-slate-500">Absensi hari ini</div>
                <div class="text-sm font-semibold text-slate-800">
                  30/30 Hadir
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ FEATURES ============ -->
    <section id="fitur" class="scroll-mt-20 py-20 lg:py-28 bg-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <!-- Header -->
        <div class="text-center max-w-2xl mx-auto">
          <span
            class="text-sm font-semibold text-emerald-600 uppercase tracking-wider"
          >
            Fitur Lengkap
          </span>
          <h2 class="mt-3 text-3xl sm:text-4xl font-bold text-slate-900">
            Semua yang Sekolah Anda Butuhkan
          </h2>
          <p class="mt-4 text-slate-600 leading-relaxed">
            Tidak perlu lagi pakai banyak aplikasi terpisah. Semua fitur dalam
            satu platform yang mudah digunakan.
          </p>
        </div>

        <!-- Grid features -->
        <div class="mt-16 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            v-for="feature in features"
            :key="feature.title"
            class="group p-6 rounded-2xl border border-slate-100 bg-white hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-200"
          >
            <div
              class="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform text-emerald-600"
            >
              <Icon :name="feature.icon" class="h-6 w-6" />
            </div>
            <h3 class="mt-4 font-semibold text-slate-900">
              {{ feature.title }}
            </h3>
            <p class="mt-2 text-sm text-slate-600 leading-relaxed">
              {{ feature.description }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ HOW IT WORKS ============ -->
    <section id="cara-kerja" class="scroll-mt-20 py-20 lg:py-28 bg-slate-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-2xl mx-auto">
          <span
            class="text-sm font-semibold text-emerald-600 uppercase tracking-wider"
          >
            Cara Kerja
          </span>
          <h2 class="mt-3 text-3xl sm:text-4xl font-bold text-slate-900">
            Mulai dalam 3 Langkah Mudah
          </h2>
        </div>

        <div class="mt-16 grid md:grid-cols-3 gap-8">
          <div v-for="(step, i) in steps" :key="step.number" class="relative">
            <!-- Garis penghubung -->
            <div
              v-if="i < steps.length - 1"
              class="hidden md:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-emerald-300 to-transparent -translate-x-1/2"
            />

            <div
              class="relative bg-white rounded-2xl p-6 border border-slate-100"
            >
              <div
                class="w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center text-xl font-bold shadow-lg shadow-emerald-500/30"
              >
                {{ step.number }}
              </div>
              <h3 class="mt-4 font-semibold text-slate-900 text-lg">
                {{ step.title }}
              </h3>
              <p class="mt-2 text-sm text-slate-600 leading-relaxed">
                {{ step.description }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ TESTIMONIALS ============ -->
    <section class="py-20 lg:py-28 bg-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-2xl mx-auto">
          <span
            class="text-sm font-semibold text-emerald-600 uppercase tracking-wider"
          >
            Testimoni
          </span>
          <h2 class="mt-3 text-3xl sm:text-4xl font-bold text-slate-900">
            Dipercaya Guru & Orang Tua
          </h2>
        </div>

        <div class="mt-16 grid md:grid-cols-3 gap-6">
          <div
            v-for="t in testimonials"
            :key="t.name"
            class="p-6 rounded-2xl bg-slate-50 border border-slate-100"
          >
            <!-- Bintang -->
            <div class="flex gap-1 text-amber-400">
              <span v-for="i in 5" :key="i"><Icon name="heroicons:star-solid" class="h-4 w-4" /></span>
            </div>
            <p class="mt-4 text-slate-700 leading-relaxed">"{{ t.text }}"</p>
            <div class="mt-6 flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-xl"
              >
                <Icon :name="t.avatar" class="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <div class="font-semibold text-slate-900 text-sm">
                  {{ t.name }}
                </div>
                <div class="text-xs text-slate-500">{{ t.role }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ CTA ============ -->
    <section class="py-20 lg:py-28 px-4">
      <div class="max-w-5xl mx-auto">
        <div
          class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-12 lg:p-16 text-center"
        >
          <!-- Dekorasi -->
          <div
            class="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-2xl"
          />
          <div
            class="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-2xl"
          />

          <div class="relative">
            <h2 class="text-3xl sm:text-4xl font-bold text-white">
              Siap Modernkan Sekolah Anda?
            </h2>
            <p class="mt-4 text-emerald-50 max-w-xl mx-auto leading-relaxed">
              Gratis untuk 1 sekolah. Tidak perlu kartu kredit. Setup dalam 5
              menit.
            </p>
            <div class="mt-8 flex flex-wrap justify-center gap-3">
              <NuxtLink
                to="/auth/register"
                class="px-6 py-3 rounded-xl bg-white text-emerald-600 font-semibold hover:bg-emerald-50 transition-colors shadow-lg"
              >
                Daftar Sekarang
              </NuxtLink>
              <NuxtLink
                to="/auth/login"
                class="px-6 py-3 rounded-xl bg-emerald-700/40 text-white font-semibold border border-white/30 hover:bg-emerald-700/60 transition-colors"
              >
                Masuk
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ FOOTER ============ -->
    <footer class="bg-slate-900 text-slate-400 py-12">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid md:grid-cols-4 gap-8">
          <!-- Brand -->
          <div class="md:col-span-2">
            <div class="flex items-center gap-2 text-white">
              <Icon name="heroicons:academic-cap" class="h-6 w-6" />
              <span class="font-bold text-lg">Talentia</span>
            </div>
            <p class="mt-4 text-sm leading-relaxed max-w-sm">
              Talenta bertumbuh bersama talenta. Kami membangun ekosistem produk
              pendidikan yang saling melengkapi, dimulai dari Talentia School.
            </p>
            <p class="mt-4 text-sm leading-relaxed max-w-sm">
              Talentia School adalah platform manajemen sekolah modern untuk
              guru, siswa, dan orang tua.
            </p>
          </div>

          <!-- Sub-brand -->
          <div>
            <h4 class="text-white font-semibold mb-4">Sub-brand</h4>
            <ul class="space-y-2 text-sm">
              <li class="text-emerald-400 font-medium">Talentia School</li>
              <li class="text-slate-500">Segera hadir</li>
            </ul>
          </div>

          <!-- Perusahaan -->
          <div>
            <h4 class="text-white font-semibold mb-4">Perusahaan</h4>
            <ul class="space-y-2 text-sm">
              <li>
                <NuxtLink to="/#fitur" class="hover:text-emerald-400 transition-colors"
                  >Fitur</NuxtLink
                >
              </li>
              <li>
                <a href="#" class="hover:text-emerald-400 transition-colors"
                  >Kontak</a
                >
              </li>
            </ul>
          </div>
        </div>

        <div class="mt-12 pt-8 border-t border-slate-800 text-sm text-center">
          © 2026 Talentia School. All rights reserved.
        </div>
      </div>
    </footer>
  </div>
</template>
