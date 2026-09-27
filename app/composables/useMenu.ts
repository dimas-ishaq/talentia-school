// app/composables/useMenu.ts

export interface MenuItem {
  label: string;
  icon: string;
  to: string;
  badge?: number;
}

export interface MenuGroup {
  title: string | null;
  items: MenuItem[];
}

// ==========================================
// ADMIN
// ==========================================
const adminMenu: MenuGroup[] = [
  {
    title: null,
    items: [{ label: "Dashboard", icon: "heroicons:home", to: "/dashboard" }],
  },
  {
    title: "Data Master",
    items: [
      { label: "Siswa", icon: "heroicons:users", to: "/dashboard/students" },
      { label: "Guru", icon: "heroicons:academic-cap", to: "/dashboard/teachers" },
      { label: "Kelas", icon: "heroicons:building-library", to: "/dashboard/classes" },
      { label: "Mata Pelajaran", icon: "heroicons:book-open", to: "/dashboard/subjects" },
    ],
  },
  {
    title: "Akademik",
    items: [
      { label: "Course", icon: "heroicons:book-open", to: "/dashboard/courses" },
      { label: "Jadwal", icon: "heroicons:calendar-days", to: "/dashboard/schedule" },
      { label: "Paket Soal", icon: "heroicons:archive-box", to: "/dashboard/question-packages" },
      { label: "Absensi", icon: "heroicons:clipboard-document-check", to: "/dashboard/attendance" },
      { label: "Nilai", icon: "heroicons:pencil-square", to: "/dashboard/grades" },
      { label: "Ujian", icon: "heroicons:beaker", to: "/dashboard/exams" },
    ],
  },
  {
    title: "Komunikasi",
    items: [
      { label: "Pengumuman", icon: "heroicons:megaphone", to: "/dashboard/announcements" },
      { label: "Kalender", icon: "heroicons:calendar-days", to: "/dashboard/calendar" },
    ],
  },
  {
    title: "Sistem",
    items: [
      { label: "Pengguna", icon: "heroicons:user-circle", to: "/dashboard/users" },
      { label: "Sekolah Saya", icon: "heroicons:building-office-2", to: "/dashboard/school" },
      { label: "Pengaturan", icon: "heroicons:cog-6-tooth", to: "/dashboard/settings" },
    ],
  },
];

// ==========================================
// GURU
// ==========================================
const teacherMenu: MenuGroup[] = [
  { title: null, items: [{ label: "Dashboard", icon: "heroicons:home", to: "/dashboard" }] },
  {
    title: "Pembelajaran",
    items: [
      { label: "Course", icon: "heroicons:book-open", to: "/dashboard/courses" },
      { label: "Jadwal", icon: "heroicons:calendar-days", to: "/dashboard/schedule" },
      { label: "Kalender Akademik", icon: "heroicons:calendar", to: "/dashboard/calendar" },
      { label: "Paket Soal", icon: "heroicons:archive-box", to: "/dashboard/question-packages" },
    ],
  },
  {
    title: "Penilaian",
    items: [
      { label: "Koreksi Tugas", icon: "heroicons:pencil", to: "/dashboard/grading" },
      { label: "Nilai Akhir", icon: "heroicons:chart-bar", to: "/dashboard/grades" },
      { label: "Analisis Butir Soal", icon: "heroicons:chart-bar-square", to: "/dashboard/analysis" },
      { label: "Absensi", icon: "heroicons:clipboard-document-check", to: "/dashboard/attendance" },
    ],
  },
  { title: "Komunikasi", items: [{ label: "Pengumuman", icon: "heroicons:megaphone", to: "/dashboard/announcements" }] },
];

// ==========================================
// SISWA
// ==========================================
const studentMenu: MenuGroup[] = [
  { title: null, items: [{ label: "Dashboard", icon: "heroicons:home", to: "/dashboard" }] },
  {
    title: "Belajar",
    items: [
      { label: "Course Saya", icon: "heroicons:book-open", to: "/dashboard/courses" },
      { label: "Jadwal", icon: "heroicons:calendar-days", to: "/dashboard/schedule" },
      { label: "Kalender Akademik", icon: "heroicons:calendar", to: "/dashboard/calendar" },
    ],
  },
  {
    title: "Tugas",
    items: [
      { label: "Tugas Aktif", icon: "heroicons:clipboard-document-list", to: "/dashboard/assignments", badge: 3 },
      { label: "Sudah Dikumpul", icon: "heroicons:check-circle", to: "/dashboard/assignments/submitted" },
    ],
  },
  {
    title: "Ujian",
    items: [
      { label: "Kuis", icon: "heroicons:beaker", to: "/dashboard/quizzes" },
      { label: "Ujian", icon: "heroicons:pencil-square", to: "/dashboard/exams" },
    ],
  },
  {
    title: "Nilai",
    items: [
      { label: "Nilai Saya", icon: "heroicons:chart-bar", to: "/dashboard/grades" },
      { label: "Progress", icon: "heroicons:arrow-trending-up", to: "/dashboard/progress" },
    ],
  },
  { title: "Komunikasi", items: [{ label: "Pengumuman", icon: "heroicons:megaphone", to: "/dashboard/announcements" }] },
];

const parentMenu: MenuGroup[] = [
  { title: null, items: [{ label: "Dashboard", icon: "heroicons:home", to: "/dashboard/parent" }] },
  { title: "Anak Saya", items: [{ label: "Absensi", icon: "heroicons:clipboard-document-check", to: "/dashboard/attendance" }, { label: "Nilai", icon: "heroicons:pencil-square", to: "/dashboard/grades" }, { label: "Progress", icon: "heroicons:arrow-trending-up", to: "/dashboard/progress" }] },
  { title: "Aktivitas", items: [{ label: "Tugas Anak", icon: "heroicons:clipboard-document-list", to: "/dashboard/assignments" }, { label: "Pengumuman", icon: "heroicons:megaphone", to: "/dashboard/announcements" }] },
];

export function useMenu() {
  const { user } = useAuth();
  const menus = computed<MenuGroup[]>(() => {
    switch (user.value?.role) {
      case "admin":
      case "org_admin":
      case "owner": return adminMenu;
      case "teacher": return teacherMenu;
      case "student": return studentMenu;
      case "parent": return parentMenu;
      default: return [];
    }
  });
  return { menus };
}
