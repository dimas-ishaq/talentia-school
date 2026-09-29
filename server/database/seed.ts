// server/database/seed.ts — DEV ONLY, data demo. Jangan jalankan di produksi.
import bcrypt from 'bcrypt'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import * as schema from './schema'
import { sql } from 'drizzle-orm'

const sqlite = new Database('./server/database/local.db')
const db = drizzle(sqlite, { schema })

function randInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min }

const firstNames = [
  'Ahmad', 'Budi', 'Citra', 'Dewi', 'Eko', 'Fitri', 'Gilang', 'Hana', 'Irfan', 'Juni',
  'Kurnia', 'Laras', 'Mega', 'Nugroho', 'Oki', 'Putri', 'Qori', 'Rizky', 'Sari', 'Tono',
  'Umar', 'Vina', 'Wawan', 'Xena', 'Yudi', 'Zahra', 'Agus', 'Bayu', 'Cahya', 'Dian',
  'Edi', 'Fajar', 'Gita', 'Hendra', 'Indah', 'Joko', 'Kiki', 'Lisa', 'Maman', 'Novi',
]

const lastNames = [
  'Pratama', 'Wijaya', 'Kusuma', 'Saputra', 'Hartono', 'Gunawan', 'Santoso', 'Setiawan',
  'Permana', 'Wibowo', 'Hidayat', 'Susanto', 'Nugraha', 'Purnama', 'Maulana', 'Ramadhan',
  'Suryana', 'Hermawan', 'Prabowo', 'Winata', 'Anggraini', 'Utami', 'Handayani', 'Lestari',
]

function generateSiswaNames(count: number) {
  const names: string[] = []
  for (let i = 0; i < count; i++) {
    const fn = firstNames[i % firstNames.length]
    const ln = lastNames[Math.floor(i / firstNames.length) % lastNames.length]
    names.push(`${fn} ${ln}`)
  }
  return names
}

async function seed() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_SEED !== 'true') {
    throw new Error('seed.ts diblokir di NODE_ENV=production. Set ALLOW_DEMO_SEED=true bila benar-benar ingin seed demo.')
  }
  console.log('🌱 Seeding...')

  const organizationId = 'org_demo'
  await db.insert(schema.organizations).values({ id: organizationId, name: 'Sekolah Demo', slug: 'sekolah-demo', status: 'trial' }).onConflictDoNothing()

  // ✅ Hash password SEKALI, pakai untuk semua user
  const password = await bcrypt.hash('password123', 10)

  // ==========================================
  // 1. USERS — admin + 4 guru + 100 siswa
  // ==========================================
  const usersData: schema.NewUser[] = [
    { id: 'u1', organizationId, email: 'admin@sekolah.com', name: 'Budi Admin', role: 'admin', password },
    { id: 'u2', organizationId, email: 'guru@sekolah.com',  name: 'Ani Guru',   role: 'teacher', password },
    { id: 'u3', organizationId, email: 'siswa@sekolah.com', name: 'Citra Siswa', role: 'student', password },
    { id: 'u4', organizationId, email: 'ortu@sekolah.com',  name: 'Dedi Ortu',   role: 'parent', password },
  ]

  // 3 guru baru
  const guruData: { id: string; email: string; name: string; subject: string; nip: string }[] = [
    { id: 'g1', email: 'guru2@sekolah.com', name: 'Budi Sains',   subject: 'IPA',              nip: '198502102006042002' },
    { id: 'g2', email: 'guru3@sekolah.com', name: 'Sari Bahasa',  subject: 'Bahasa Indonesia',  nip: '198703152007012003' },
    { id: 'g3', email: 'guru4@sekolah.com', name: 'Dwi Sosial',   subject: 'IPS',              nip: '198812202008032004' },
  ]
  for (const g of guruData) {
    usersData.push({ id: g.id, organizationId, email: g.email, name: g.name, role: 'teacher', password })
  }

  // 100 siswa + user entries
  const siswaNames = generateSiswaNames(100)
  for (let i = 0; i < 100; i++) {
    const num = String(i + 1).padStart(3, '0')
    usersData.push({
      id: `u_s${num}`,
      organizationId,
      email: `siswa${num}@sekolah.com`,
      name: siswaNames[i]!,
      role: 'student',
      password,
    })
  }

  await db.insert(schema.users).values(usersData).onConflictDoNothing()
  console.log(`  ✔ ${usersData.length} users`)

  // ==========================================
  // 2. TEACHERS — 4 guru mapel
  // ==========================================
  const teachersData: schema.NewTeacher[] = [
    { id: 't1', userId: 'u2', code: 'G001', nip: '198001012005011001', phone: '081234567890', subject: 'Matematika' },
    { id: 't2', userId: 'g1', code: 'G002', nip: '198502102006042002', phone: '081234567891', subject: 'IPA' },
    { id: 't3', userId: 'g2', code: 'G003', nip: '198703152007012003', phone: '081234567892', subject: 'Bahasa Indonesia' },
    { id: 't4', userId: 'g3', code: 'G004', nip: '198812202008032004', phone: '081234567893', subject: 'IPS' },
  ]
  await db.insert(schema.teachers).values(teachersData).onConflictDoNothing()
  console.log(`  ✔ ${teachersData.length} teachers`)

  // ==========================================
  // 3. CLASSES — 3 kelas
  // ==========================================
  const classesData: schema.NewClass[] = [
    { id: 'c1', name: '6A', level: 6, teacherId: 't1' },
    { id: 'c2', name: '6B', level: 6, teacherId: 't2' },
    { id: 'c3', name: '6C', level: 6, teacherId: 't3' },
  ]
  await db.insert(schema.classes).values(classesData).onConflictDoNothing()
  console.log(`  ✔ ${classesData.length} classes`)

  // ==========================================
  // 4. STUDENTS — 100 siswa dibagi 3 kelas
  // ==========================================
  const classDistribution = [
    { classId: 'c1', start: 0, count: 34 },  // 6A: 34
    { classId: 'c2', start: 34, count: 33 }, // 6B: 33
    { classId: 'c3', start: 67, count: 33 }, // 6C: 33
  ]
  const studentsData: schema.NewStudent[] = [
    // Existing demo student
    { id: 's1', userId: 'u3', nis: '2024001', classId: 'c1', parentId: 'p1', gender: 'P', birthDate: '2012-05-15' },
  ]
  for (const dist of classDistribution) {
    for (let i = 0; i < dist.count; i++) {
      const idx = dist.start + i
      const num = String(idx + 1).padStart(3, '0')
      const gender = i % 2 === 0 ? 'L' : 'P'
      const day = String(randInt(1, 28)).padStart(2, '0')
      const month = String(randInt(1, 12)).padStart(2, '0')
      const year = 2012 - randInt(0, 1) // usia 14-15 saat ini (2026)
      studentsData.push({
        id: `s${num}`,
        userId: `u_s${num}`,
        nis: `2024${num}`,
        classId: dist.classId,
        gender,
        birthDate: `${year}-${month}-${day}`,
      })
    }
  }
  await db.insert(schema.students).values(studentsData).onConflictDoNothing()
  console.log(`  ✔ ${studentsData.length} students`)

  // ==========================================
  // 5. PARENTS
  // ==========================================
  await db.insert(schema.parents).values({
    id: 'p1', userId: 'u4', phone: '089876543210', occupation: 'Karyawan',
  }).onConflictDoNothing()
  console.log('  ✔ parents')

  // ==========================================
  // 6. SUBJECTS (mapel)
  // ==========================================
  const subjectsData: schema.NewSubject[] = [
    { id: 'm1', code: 'MTK',    name: 'Matematika',      description: 'Matematika untuk SD' },
    { id: 'm2', code: 'IPA',    name: 'Ilmu Pengetahuan Alam', description: 'IPA untuk SD' },
    { id: 'm3', code: 'BHS-ID', name: 'Bahasa Indonesia', description: 'Bahasa Indonesia SD' },
    { id: 'm4', code: 'IPS',    name: 'Ilmu Pengetahuan Sosial', description: 'IPS untuk SD' },
  ]
  await db.insert(schema.subjects).values(subjectsData).onConflictDoNothing()
  console.log(`  ✔ ${subjectsData.length} subjects`)

  // ==========================================
  // 6a. CATEGORIES — kategori navigasi course
  // ==========================================
  const categoriesData: schema.NewCategory[] = [
    { id: 'cat1', name: 'Kelas 6', parentId: null, position: 1, isVisible: true },
    { id: 'cat2', name: 'Matematika', parentId: 'cat1', position: 1, isVisible: true },
    { id: 'cat3', name: 'IPA', parentId: 'cat1', position: 2, isVisible: true },
    { id: 'cat4', name: 'Bahasa Indonesia', parentId: 'cat1', position: 3, isVisible: true },
    { id: 'cat5', name: 'IPS', parentId: 'cat1', position: 4, isVisible: true },
  ]
  await db.insert(schema.categories).values(categoriesData).onConflictDoNothing()
  console.log(`  ✔ ${categoriesData.length} categories`)

  // ==========================================
  // 7. COURSES — 4 course per mapel
  // ==========================================
  const coursesData: schema.NewCourse[] = [
    { id: 'course1', name: 'Matematika',      code: 'MTK',    description: 'Course Matematika kelas 6', subjectId: 'm1', categoryId: 'cat2', position: 1, createdBy: 'u1' },
    { id: 'course2', name: 'IPA',             code: 'IPA',    description: 'Course IPA kelas 6',        subjectId: 'm2', categoryId: 'cat3', position: 1, createdBy: 'u1' },
    { id: 'course3', name: 'Bahasa Indonesia', code: 'BHS-ID', description: 'Course Bahasa Indonesia',   subjectId: 'm3', categoryId: 'cat4', position: 1, createdBy: 'u1' },
    { id: 'course4', name: 'IPS',             code: 'IPS',    description: 'Course IPS kelas 6',        subjectId: 'm4', categoryId: 'cat5', position: 1, createdBy: 'u1' },
  ]
  await db.insert(schema.courses).values(coursesData).onConflictDoNothing()
  console.log(`  ✔ ${coursesData.length} courses`)

  // Course teachers
  const courseTeachersData: schema.NewCourseTeacher[] = [
    { courseId: 'course1', teacherId: 't1' },
    { courseId: 'course2', teacherId: 't2' },
    { courseId: 'course3', teacherId: 't3' },
    { courseId: 'course4', teacherId: 't4' },
  ]
  await db.insert(schema.courseTeachers).values(courseTeachersData).onConflictDoNothing()
  console.log(`  ✔ ${courseTeachersData.length} course-teacher assignments`)

  // Course classes — semua 3 kelas di semua 4 course
  const courseClassesData: schema.NewCourseClass[] = []
  for (const courseId of ['course1', 'course2', 'course3', 'course4']) {
    for (const classId of ['c1', 'c2', 'c3']) {
      courseClassesData.push({ courseId, classId })
    }
  }
  await db.insert(schema.courseClasses).values(courseClassesData).onConflictDoNothing()
  console.log(`  ✔ ${courseClassesData.length} course-class assignments`)

  // ==========================================
  // 8. SECTIONS & ACTIVITIES — per course
  // ==========================================
  for (const courseId of ['course1', 'course2', 'course3', 'course4']) {
    await db.insert(schema.sections).values([
      { id: `${courseId}-sec1`, courseId, title: 'Umum', position: 1 },
      { id: `${courseId}-sec2`, courseId, title: 'Pertemuan 1', description: 'Materi perdana', position: 2 },
      { id: `${courseId}-sec3`, courseId, title: 'Pertemuan 2', description: 'Materi lanjutan', position: 3 },
    ]).onConflictDoNothing()
  }
  console.log(`  ✔ sections`)

  const activityTemplates: Record<string, { type: schema.NewActivity['type']; title: string; content?: string; url?: string; points?: number }[]> = {
    course1: [
      { type: 'text', title: 'Salam Pembuka Matematika', content: 'Selamat datang di course Matematika!' },
      { type: 'file', title: 'Modul Bilangan', url: 'https://example.com/bilangan.pdf', points: 10 },
      { type: 'video', title: 'Video Operasi Hitung', url: 'https://example.com/operasi-hitung', points: 0 },
      { type: 'assignment', title: 'Tugas 1: Latihan Bilangan', content: 'Kerjakan 10 soal bilangan bulat.', points: 100 },
      { type: 'quiz', title: 'Kuis Bilangan', url: 'https://example.com/kuis-bilangan', points: 50 },
      { type: 'presentation', title: 'Slide Bangun Datar', url: 'https://example.com/bangun-datar', points: 20 },
    ],
    course2: [
      { type: 'text', title: 'Salam Pembuka IPA', content: 'Selamat datang di course IPA!' },
      { type: 'video', title: 'Video Sistem Tata Surya', url: 'https://example.com/tata-surya', points: 0 },
      { type: 'file', title: 'Modul Gerak Benda', url: 'https://example.com/gerak-benda.pdf', points: 10 },
      { type: 'assignment', title: 'Laporan Praktikum', content: 'Buat laporan pengamatan sederhana.', points: 100 },
      { type: 'quiz', title: 'Kuis IPA', url: 'https://example.com/kuis-ipa', points: 50 },
    ],
    course3: [
      { type: 'text', title: 'Salam Pembuka Bahasa Indonesia', content: 'Selamat datang di course Bahasa Indonesia!' },
      { type: 'file', title: 'Modul Cerita Anak', url: 'https://example.com/cerita-anak.pdf', points: 10 },
      { type: 'assignment', title: 'Menulis Cerpen', content: 'Tulis cerpen minimal 3 paragraf.', points: 100 },
      { type: 'presentation', title: 'Slide Puisi', url: 'https://example.com/puisi', points: 20 },
      { type: 'forum', title: 'Diskusi: Tokoh Favorit', content: 'Siapa tokoh favorit dalam cerita yang kamu baca?', points: 10 },
    ],
    course4: [
      { type: 'text', title: 'Salam Pembuka IPS', content: 'Selamat datang di course IPS!' },
      { type: 'video', title: 'Video Kenampakan Alam', url: 'https://example.com/kenampakan-alam', points: 0 },
      { type: 'file', title: 'Modul Keragaman Budaya', url: 'https://example.com/keragaman-budaya.pdf', points: 10 },
      { type: 'assignment', title: 'Tugas Peta Indonesia', content: 'Gambar dan beri nama provinsi di Indonesia.', points: 100 },
      { type: 'quiz', title: 'Kuis IPS', url: 'https://example.com/kuis-ips', points: 50 },
    ],
  }

  for (const [courseId, activities] of Object.entries(activityTemplates)) {
    const secIds = [`${courseId}-sec1`, `${courseId}-sec2`, `${courseId}-sec3`]
    const activitiesData: schema.NewActivity[] = activities.map((a, i) => ({
      id: `${courseId}-act${i + 1}`,
      sectionId: secIds[i < 1 ? 0 : i < 3 ? 1 : 2]!, // sec1: first activity, sec2: next 2, sec3: rest
      type: a.type,
      title: a.title,
      content: a.content || null,
      url: a.url || null,
      points: a.points ?? null,
      position: (i < 1 ? 0 : i < 3 ? i - 1 : i - 2) + 1,
      isRequired: a.type === 'assignment' || a.type === 'quiz',
    }))
    await db.insert(schema.activities).values(activitiesData).onConflictDoNothing()
  }
  console.log(`  ✔ activities`)

  // ==========================================
  // 9. ANNOUNCEMENTS — pengumuman sekolah
  // ==========================================
  const announcementsData: schema.NewAnnouncement[] = [
    { id: 'ann1', title: 'Ujian Tengah Semester', content: 'UTS semester ini diadakan pekan depan.\nPastikan siswa mempersiapkan diri dengan baik.', authorId: 'u1', isPublished: true, publishedAt: new Date(Date.now() - 3 * 864e5) },
    { id: 'ann2', title: 'Lomba Sains Nasional', content: 'Pendaftaran lomba sains dibuka hingga akhir bulan.', authorId: 'u1', isPublished: true, publishedAt: new Date(Date.now() - 5 * 864e5) },
  ]
  await db.insert(schema.announcements).values(announcementsData).onConflictDoNothing()
  console.log(`  ✔ announcements`)

  // ==========================================
  // 10. CALENDAR EVENTS — contoh agenda akademik
  // ==========================================
  const calendarEventsData: schema.NewCalendarEvent[] = [
    {
      id: 'cal1',
      title: 'Awal Semester Ganjil 2025/2026',
      description: 'Pertama kali masuk sekolah setelah libur panjang.',
      startDate: '2025-07-15',
      endDate: null,
      location: null,
      type: 'semester_start',
      category: 'Sekolah',
      isHoliday: false,
      visibility: 'public',
      color: '#0ea5e9',
      createdBy: 'u1',
      updatedAt: new Date(),
    },
    {
      id: 'cal2',
      title: 'Ujian Tengah Semester Ganjil',
      description: 'UTS untuk semua kelas 6.',
      startDate: '2025-10-13',
      endDate: '2025-10-17',
      location: 'Ruang Kelas',
      type: 'exam',
      category: 'Akademik',
      isHoliday: false,
      visibility: 'internal',
      color: '#ef4444',
      createdBy: 'u1',
      updatedAt: new Date(),
    },
    {
      id: 'cal3',
      title: 'Libur Semester Ganjil',
      description: 'Libur tengah semester.',
      startDate: '2025-12-20',
      endDate: '2026-01-05',
      location: null,
      type: 'break',
      category: null,
      isHoliday: true,
      visibility: 'public',
      color: '#14b8a6',
      createdBy: 'u1',
      updatedAt: new Date(),
    },
  ]
  await db.insert(schema.calendarEvents).values(calendarEventsData).onConflictDoNothing()
  for (const table of [schema.teachers, schema.students, schema.classes, schema.subjects, schema.courses, schema.categories, schema.announcements, schema.calendarEvents]) {
    await db.update(table).set({ organizationId }).where(sql`${table.organizationId} IS NULL`)
  }
  await db.insert(schema.organizationMembers).values(usersData.map((user) => ({ organizationId, userId: user.id, role: user.role === 'admin' ? 'org_admin' : user.role, status: 'active' as const }))).onConflictDoNothing()
  console.log(`  ✔ ${calendarEventsData.length} calendar events`)

  // ==========================================
  // DONE
  // ==========================================
  console.log('')
  console.log('✅ Seed selesai!')
  console.log('')
  console.log('📧 Demo akun (password: password123):')
  console.log('   admin@sekolah.com       → admin')
  console.log('   guru@sekolah.com        → teacher (Matematika)')
  console.log('   guru2@sekolah.com       → teacher (IPA)')
  console.log('   guru3@sekolah.com       → teacher (Bahasa Indonesia)')
  console.log('   guru4@sekolah.com       → teacher (IPS)')
  console.log('   siswa@sekolah.com       → student demo')
  console.log('   siswa001@sekolah.com    → student (6A)')
  console.log('   ...')
  console.log('   siswa100@sekolah.com    → student (6C)')
  console.log('   ortu@sekolah.com        → parent')
  console.log('')
  console.log('📊 Statistik:')
  console.log('   - 100 siswa (3 kelas: 6A=34, 6B=33, 6C=33)')
  console.log('   - 4 guru mapel')
  console.log('   - 4 course (Matematika, IPA, B. Indonesia, IPS)')
  console.log('')

  process.exit(0)
}

seed().catch((err) => {
  console.error('❌ Seed gagal:', err)
  process.exit(1)
})