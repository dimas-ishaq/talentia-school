// server/database/schema.ts
import { relations } from 'drizzle-orm';
import { pgTable, text, integer, real, boolean, timestamp, uniqueIndex, index, foreignKey } from 'drizzle-orm/pg-core';

export const organizations = pgTable('organizations', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  status: text('status', { enum: ['trial', 'active', 'past_due', 'suspended', 'cancelled'] }).notNull().default('trial'),
  createdAt: timestamp('created_at').notNull().$defaultFn(() => new Date()),
})

export const organizationMembers = pgTable('organization_members', {
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['owner', 'org_admin', 'teacher', 'student', 'parent'] }).notNull(),
  status: text('status', { enum: ['active', 'invited', 'suspended'] }).notNull().default('active'),
}, (table) => ({ memberIdx: uniqueIndex('organization_members_pk').on(table.organizationId, table.userId) }))

export const organizationInvites = pgTable('organization_invites', {
  tokenHash: text('token_hash').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  role: text('role', { enum: ['org_admin', 'teacher', 'student', 'parent'] }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  acceptedAt: timestamp('accepted_at'),
  createdAt: timestamp('created_at').notNull().$defaultFn(() => new Date()),
}, (table) => ({ emailOrgIdx: index('organization_invites_email_idx').on(table.organizationId, table.email) }))

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').references(() => organizations.id, { onDelete: 'set null' }),
  platformRole: text('platform_role', { enum: ['platform_owner', 'platform_admin', 'platform_support'] }),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  role: text('role', { enum: ['admin', 'owner', 'org_admin', 'teacher', 'student', 'parent'] }).notNull(),
  password: text('password').notNull(),
  mustChangePassword: boolean('must_change_password').notNull().default(false),
  createdAt:timestamp('created_at').notNull().$defaultFn(()=>new Date())
});

export const passwordResetTokens = pgTable('password_reset_tokens', {
  tokenHash: text('token_hash').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().$defaultFn(() => new Date()),
})

export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  target: text('target'),
  metadata: text('metadata'),
  createdAt: timestamp('created_at').notNull().$defaultFn(() => new Date()),
}, (table) => ({ createdAtIdx: index('audit_logs_created_at_idx').on(table.createdAt) }))

// ==========================================
// TEACHERS — data khusus guru
// ==========================================
export const teachers = pgTable('teachers', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
    .unique(),
  code: text('code').unique(),          // Kode guru (G001, TCH2024, dll)
  nip: text('nip').unique(),            // Nomor Induk Pegawai
  phone: text('phone'),
  address: text('address'),
  subject: text('subject'),              // mapel yang diampu
  // false = akun tidak bisa login & disembunyikan dari filter "Aktif"
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at')
    .notNull()
    .$defaultFn(() => new Date()),
})

// ==========================================
// PARENTS — data khusus orang tua
// ==========================================
export const parents = pgTable('parents', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
    .unique(),
  phone: text('phone').notNull(),
  address: text('address'),
  occupation: text('occupation'),        // pekerjaan
  createdAt: timestamp('created_at')
    .notNull()
    .$defaultFn(() => new Date()),
})


// ==========================================
// STUDENTS — data khusus siswa
// ==========================================
export const students = pgTable('students', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
    .unique(),
  nis: text('nis').unique(),              // Diisi saat profil siswa dilengkapi
  classId: text('class_id').references(() => classes.id),
  parentId: text('parent_id').references(() => parents.id),
  gender: text('gender', { enum: ['L', 'P'] }),
  // false = akun tidak bisa login & disembunyikan dari filter "Aktif"
  isActive: boolean('is_active').notNull().default(true),
  birthDate: text('birth_date'),
  phone: text('phone'),
  address: text('address'),
  createdAt: timestamp('created_at')
    .notNull()
    .$defaultFn(() => new Date()),
})

export const classes = pgTable('classes', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),        // "6A"
  level: integer('level').notNull(),    // 6
  teacherId: text('teacher_id').references(() => teachers.id),
  // false = kelas disembunyikan dari filter "Aktif"
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at')
    .notNull()
    .$defaultFn(() => new Date()),
})

// ==========================================
// SUBJECTS — mata pelajaran (master data mandiri,
// tidak punya relasi ke tabel lain)
// ==========================================
export const subjects = pgTable('subjects', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  code: text('code').notNull().unique(), // "MTK", "IPA", "BHS-IND"
  name: text('name').notNull().unique(), // "Matematika"
  description: text('description'),
  // false = mapel disembunyikan dari filter "Aktif"
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at')
    .notNull()
    .$defaultFn(() => new Date()),
})

// ==========================================
// ANNOUNCEMENTS — pengumuman sekolah
// ==========================================
export const announcements = pgTable('announcements', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content').notNull(),
  authorId: text('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  isPublished: boolean('is_active').notNull().default(false),
  publishedAt: timestamp('created_at'),
  createdAt: timestamp('created_at').notNull().$defaultFn(() => new Date()),
})

// ==========================================
// ATTENDANCE — absensi siswa per tanggal
// ==========================================
export const attendance = pgTable('attendance', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  studentId: text('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  classId: text('class_id').notNull().references(() => classes.id, { onDelete: 'cascade' }),
  courseId: text('course_id').references(() => courses.id, { onDelete: 'cascade' }), // null untuk data lama
  subjectId: text('subject_id').references(() => subjects.id, { onDelete: 'restrict' }), // null untuk data lama
  date: text('date').notNull(), // YYYY-MM-DD
  status: text('status', { enum: ['present', 'late', 'excused', 'sick', 'absent'] }).notNull(),
  note: text('note'),
  activityNote: text('activity_note'),
  learningNote: text('learning_note'),
  recordedBy: text('recorded_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at').notNull().$defaultFn(() => new Date()),
}, (table) => ({ uniqueStudentSubjectDate: uniqueIndex('attendance_student_subject_date_idx').on(table.studentId, table.subjectId, table.date), uniqueStudentCourseDate: uniqueIndex('attendance_student_course_date_idx').on(table.studentId, table.courseId, table.date) }))

// ==========================================
// EXAMS — ujian atau asesmen
// ==========================================
export const exams = pgTable('exams', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  subjectId: text('subject_id').notNull().references(() => subjects.id, { onDelete: 'restrict' }),
  classId: text('class_id').notNull().references(() => classes.id, { onDelete: 'cascade' }),
  examDate: text('exam_date').notNull(),
  description: text('description'),
  createdBy: text('created_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at').notNull().$defaultFn(() => new Date()),
})

// ==========================================
// GRADES — nilai siswa untuk ujian
// ==========================================
export const grades = pgTable('grades', {
  id: text('id').primaryKey(),
  examId: text('exam_id').notNull().references(() => exams.id, { onDelete: 'cascade' }),
  studentId: text('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  score: real('score').notNull(),
  note: text('note'),
  recordedBy: text('recorded_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at').notNull().$defaultFn(() => new Date()),
}, (table) => ({ uniqueExamStudent: uniqueIndex('grades_exam_student_idx').on(table.examId, table.studentId) }))

// ==========================================
// COURSE_GRADE_WEIGHTS — konfigurasi bobot nilai per course
// ==========================================
export const courseGradeWeights = pgTable('course_grade_weights', {
  id: text('id').primaryKey(),
  courseId: text('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  // Bobot per aktivitas type (%), disimpan sebagai JSON object:
  // { "assignment": 30, "quiz": 40, "forum": 10, "text": 20 }
  weightsJson: text('weights_json').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdBy: text('created_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at').notNull().$defaultFn(() => new Date()),
  updatedAt: timestamp('created_at').notNull().$defaultFn(() => new Date()),
})

// ==========================================
// FINAL_GRADES — snapshot nilai akhir siswa per course
// ==========================================
export const finalGrades = pgTable('final_grades', {
  id: text('id').primaryKey(),
  courseId: text('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  studentId: text('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  score: real('score').notNull(),           // Nilai 0-100
  grade: text('grade').notNull(),           // Letter grade: A/B/C/D/E
  feedback: text('feedback'),               // Catatan guru (opsional)
  componentsJson: text('components_json'),  // Komponen per type dengan rata-rata dan skor
  calculatedAt: timestamp('created_at').notNull(),
  calculatedBy: text('calculated_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  // Fase 3: kapan nilai akhir dipublish ke siswa. null = masih draft.
  publishedAt: timestamp('published_at'),
  version: integer('version').notNull().default(1), // versi snapshot (increment saat re-calculate)
})

// ==========================================
// CALENDAR_EVENTS — agenda dan acara akademik
// ==========================================
export const calendarEventTypes = ['exam', 'holiday', 'activity', 'meeting', 'competition', 'semester_start', 'semester_end', 'break', 'other'] as const
export type CalendarEventType = typeof calendarEventTypes[number]

export const calendarEvents = pgTable('calendar_events', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  startDate: text('start_date').notNull(),
  endDate: text('end_date'),
  location: text('location'),
  type: text('type', { enum: calendarEventTypes }).notNull().default('other'),
  category: text('category'), // e.g., "nasional", "sekolah", "khusus kelas"
  isHoliday: boolean('is_active').notNull().default(false),
  visibility: text('visibility', { enum: ['public', 'internal', 'private'] }).notNull().default('public'),
  color: text('color'), // hex color untuk kalender visual
  createdBy: text('created_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at').notNull().$defaultFn(() => new Date()),
  updatedAt: timestamp('created_at')
    .notNull()
    .$defaultFn(() => new Date())
})

// ==========================================
// SCHEDULE_ENTRIES — jadwal pelajaran mingguan per kelas
// Satu baris = satu slot jadwal (hari + jam + mapel + kelas + guru).
// Jadwal diikat ke kelas SPESIFIK (bukan level), mis. "11 RPL 1".
// Perubahan jadwal menimpa data lama (tanpa riwayat semester).
// ==========================================
export const scheduleEntries = pgTable('schedule_entries', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  dayOfWeek: integer('day_of_week').notNull(), // 1=Senin ... 6=Sabtu
  startTime: text('start_time').notNull(),     // "07:00"
  endTime: text('end_time').notNull(),         // "08:30"
  subjectId: text('subject_id').notNull().references(() => subjects.id, { onDelete: 'restrict' }),
  classId: text('class_id').notNull().references(() => classes.id, { onDelete: 'cascade' }),
  teacherId: text('teacher_id').references(() => teachers.id, { onDelete: 'set null' }),
  room: text('room'),                          // opsional, mis. "Lab IPA"
  note: text('note'),                          // opsional
  // false = slot disembunyikan dari jadwal aktif
  isActive: boolean('is_active').notNull().default(true),
  createdBy: text('created_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at').notNull().$defaultFn(() => new Date()),
})

// ==========================================
// SETTINGS — konfigurasi global sekolah berbasis key-value
// ==========================================
export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  organizationId: text('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  value: text('value').notNull(),
  updatedAt: timestamp('created_at')
    .notNull()
    .$defaultFn(() => new Date()),
})

// ==========================================
// RELATIONS — biar bisa query dengan `with`
// ==========================================

export const usersRelations = relations(users, ({ one, many }) => ({
  teacher: one(teachers, { fields: [users.id], references: [teachers.userId] }),
  student: one(students, { fields: [users.id], references: [students.userId] }),
  parent: one(parents, { fields: [users.id], references: [parents.userId] }),
  announcements: many(announcements),
  recordedAttendance: many(attendance),
  createdExams: many(exams),
  recordedGrades: many(grades),
  calendarEvents: many(calendarEvents),
}))

export const teachersRelations = relations(teachers, ({ one, many }) => ({
  user: one(users, {
    fields: [teachers.userId],
    references: [users.id],
  }),
  classes: many(classes),    // kelas yang diwali
  scheduleEntries: many(scheduleEntries),
}))

export const studentsRelations = relations(students, ({ one, many }) => ({
  user: one(users, { fields: [students.userId], references: [users.id] }),
  class: one(classes, { fields: [students.classId], references: [classes.id] }),
  parent: one(parents, { fields: [students.parentId], references: [parents.id] }),
  attendance: many(attendance),
  grades: many(grades),
}))

export const parentsRelations = relations(parents, ({ one, many }) => ({
  user: one(users, {
    fields: [parents.userId],
    references: [users.id],
  }),
  children: many(students),  // anak-anaknya
}))

export const classesRelations = relations(classes, ({ one, many }) => ({
  teacher: one(teachers, { fields: [classes.teacherId], references: [teachers.id] }),
  students: many(students),
  attendance: many(attendance),
  exams: many(exams),
  scheduleEntries: many(scheduleEntries),
}))

// ==========================================
// TYPES — untuk dipakai di frontend/backend
// ==========================================

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

export type Teacher = typeof teachers.$inferSelect
export type NewTeacher = typeof teachers.$inferInsert

export type Student = typeof students.$inferSelect
export type NewStudent = typeof students.$inferInsert

export type Parent = typeof parents.$inferSelect
export type NewParent = typeof parents.$inferInsert

export type Class = typeof classes.$inferSelect
export type NewClass = typeof classes.$inferInsert

export const announcementsRelations = relations(announcements, ({ one }) => ({
  author: one(users, { fields: [announcements.authorId], references: [users.id] }),
}))

export const attendanceRelations = relations(attendance, ({ one }) => ({
  student: one(students, { fields: [attendance.studentId], references: [students.id] }),
  class: one(classes, { fields: [attendance.classId], references: [classes.id] }),
  recorder: one(users, { fields: [attendance.recordedBy], references: [users.id] }),
}))

export const examsRelations = relations(exams, ({ one, many }) => ({
  subject: one(subjects, { fields: [exams.subjectId], references: [subjects.id] }),
  class: one(classes, { fields: [exams.classId], references: [classes.id] }),
  creator: one(users, { fields: [exams.createdBy], references: [users.id] }),
  grades: many(grades),
}))

export const gradesRelations = relations(grades, ({ one }) => ({
  exam: one(exams, { fields: [grades.examId], references: [exams.id] }),
  student: one(students, { fields: [grades.studentId], references: [students.id] }),
  recorder: one(users, { fields: [grades.recordedBy], references: [users.id] }),
}))

export const calendarEventsRelations = relations(calendarEvents, ({ one }) => ({
  creator: one(users, { fields: [calendarEvents.createdBy], references: [users.id] }),
}))

export const scheduleEntriesRelations = relations(scheduleEntries, ({ one }) => ({
  subject: one(subjects, { fields: [scheduleEntries.subjectId], references: [subjects.id] }),
  class: one(classes, { fields: [scheduleEntries.classId], references: [classes.id] }),
  teacher: one(teachers, { fields: [scheduleEntries.teacherId], references: [teachers.id] }),
  creator: one(users, { fields: [scheduleEntries.createdBy], references: [users.id] }),
}))

export type Subject = typeof subjects.$inferSelect
export type NewSubject = typeof subjects.$inferInsert
export type Announcement = typeof announcements.$inferSelect
export type NewAnnouncement = typeof announcements.$inferInsert
export type Attendance = typeof attendance.$inferSelect
export type NewAttendance = typeof attendance.$inferInsert
export type Exam = typeof exams.$inferSelect
export type NewExam = typeof exams.$inferInsert
export type Grade = typeof grades.$inferSelect
export type NewGrade = typeof grades.$inferInsert
export type CalendarEvent = typeof calendarEvents.$inferSelect
export type NewCalendarEvent = typeof calendarEvents.$inferInsert
export type ScheduleEntry = typeof scheduleEntries.$inferSelect
export type NewScheduleEntry = typeof scheduleEntries.$inferInsert
// ==========================================
// CATEGORIES — kategori navigasi course (bertingkat)
// ==========================================
export const categories = pgTable('categories', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull().unique(),
  parentId: text('parent_id'),
  position: integer('position').notNull().default(0),
  isVisible: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().$defaultFn(() => new Date()),
}, (table) => ({
  parentFk: foreignKey({ columns: [table.parentId], foreignColumns: [table.id] }).onDelete('set null'),
}))

// ==========================================
// COURSES — course = mapel dengan kelas + guru
// ==========================================
export const courses = pgTable('courses', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull().unique(),
  code: text('code'),
  description: text('description'),
  coverUrl: text('cover_url'),
  isActive: boolean('is_active').notNull().default(true),
  // true = container internal (mis. soal ujian dari Exam Events), disembunyikan dari daftar course
  isSystem: boolean('is_active').notNull().default(false),
  categoryId: text('category_id').references(() => categories.id, { onDelete: 'set null' }),
  subjectId: text('subject_id').references(() => subjects.id, { onDelete: 'set null' }),
  position: integer('position').notNull().default(0),
  createdBy: text('created_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at').notNull().$defaultFn(() => new Date()),
})

// Guru pengampu
export const courseTeachers = pgTable('course_teachers', {
  courseId: text('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  teacherId: text('teacher_id').notNull().references(() => teachers.id, { onDelete: 'cascade' }),
}, (table) => ({ pk: uniqueIndex('ct_pk').on(table.courseId, table.teacherId) }))

// Kelas peserta
export const courseClasses = pgTable('course_classes', {
  courseId: text('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  classId: text('class_id').notNull().references(() => classes.id, { onDelete: 'cascade' }),
}, (table) => ({ pk: uniqueIndex('cc_pk').on(table.courseId, table.classId) }))

export const sections = pgTable('sections', {
  id: text('id').primaryKey(),
  courseId: text('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  position: integer('position').notNull(),
  isVisible: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().$defaultFn(() => new Date()),
})

export const activities = pgTable('activities', {
  id: text('id').primaryKey(),
  sectionId: text('section_id').notNull().references(() => sections.id, { onDelete: 'cascade' }),
  type: text('type', {
    enum: ['text', 'file', 'video', 'quiz', 'assignment', 'forum', 'presentation', 'link'],
  }).notNull(),
  title: text('title').notNull(),
  content: text('content'),
  url: text('url'),
  // Khusus materi bacaan (type 'text'):
  // - objectives  : tujuan pembelajaran, disimpan sebagai JSON array of string
  // - readingMinutes: estimasi waktu baca (menit)
  // - attachments : lampiran, JSON array of { name, url, kind }
  objectives: text('objectives'),
  readingMinutes: integer('reading_minutes'),
  attachments: text('attachments'),
  points: integer('points'),
  maxPoint: real('max_point').notNull().default(100),
  // Nilai minimal untuk dianggap lulus (khusus quiz). 0/null = tidak ada ambang.
  passingScore: real('passing_score'),
  // Fase 2: izinkan pengumpulan setelah dueDate (default true untuk assignment).
  allowLateSubmission: boolean('allow_late_submission').notNull().default(true),
  durationMinutes: integer('duration_minutes'),
  openAt: text('open_at'),
  closeAt: text('close_at'),
  maxAttempts: integer('max_attempts'),
  examMode: boolean('exam_mode').notNull().default(false),
  fullscreenMode: boolean('fullscreen_mode').notNull().default(false),
  // Kata sandi kuis (hash bcrypt) + aturan pengerjaan dari guru
  quizPassword: text('quiz_password'),
  quizInstructions: text('quiz_instructions'),
  status: text('status', { enum: ['draft', 'published'] }).notNull().default('draft'),
  // Kapan nilai quiz ditampilkan ke siswa: immediate, after_close (setelah quiz ditutup), never
  scoreVisibility: text('score_visibility', { enum: ['immediate', 'after_close', 'never'] }).notNull().default('immediate'),
  // Kapan siswa bisa melihat review jawaban benar/salah: immediate, after_close, never
  reviewMode: text('review_mode', { enum: ['immediate', 'after_close', 'never'] }).notNull().default('immediate'),
  dueDate: text('due_date'),
  position: integer('position').notNull(),
  isRequired: boolean('is_required').notNull().default(true),
  isVisible: boolean('is_visible').notNull().default(true),
  forumRequirePost: boolean('forum_require_post').notNull().default(false),
  forumRequireReply: boolean('forum_require_reply').notNull().default(false),
  forumCompletionRule: text('forum_completion_rule', { enum: ['view', 'post', 'reply'] }).notNull().default('view'),
  // Khusus type 'link': view = klik link dihitung selesai, complete = siswa menandai sendiri
  linkCompletionRule: text('link_completion_rule', { enum: ['view', 'complete'] }).notNull().default('view'),
  linkOpenInNewTab: boolean('link_open_in_new_tab').notNull().default(true),
  // Khusus type 'presentation':
  // - presentationSource: 'file' (upload internal) atau 'link' (URL eksternal)
  // - presentationFileUrl: path PDF hasil konversi PPTX/PPT (untuk pdfjs-dist viewer)
  // - presentationOriginalUrl: path file asli (.ppt/.pptx) untuk diunduh kembali oleh siswa
  presentationSource: text('presentation_source', { enum: ['file', 'link'] }),
  presentationFileUrl: text('presentation_file_url'),
  presentationOriginalUrl: text('presentation_original_url'),
  presentationPageCount: integer('presentation_page_count'),
  createdAt: timestamp('created_at').notNull().$defaultFn(() => new Date()),
})

export const forumDiscussions = pgTable('forum_discussions', {
  id: text('id').primaryKey(),
  activityId: text('activity_id').notNull().references(() => activities.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  question: text('question').notNull(),
  createdBy: text('created_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at').notNull().$defaultFn(() => new Date()),
  updatedAt: timestamp('updated_at').notNull().$defaultFn(() => new Date()),
}, (table) => ({ activityIdx: index('forum_discussions_activity_idx').on(table.activityId) }))

export const forumPosts = pgTable('forum_posts', {
  id: text('id').primaryKey(),
  activityId: text('activity_id').notNull().references(() => activities.id, { onDelete: 'cascade' }),
  discussionId: text('discussion_id').references(() => forumDiscussions.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  studentId: text('student_id').references(() => students.id, { onDelete: 'cascade' }),
  parentId: text('parent_id'),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').notNull().$defaultFn(() => new Date()),
  updatedAt: timestamp('updated_at').notNull().$defaultFn(() => new Date()),
}, (table) => ({ activityIdx: index('forum_posts_activity_idx').on(table.activityId), discussionIdx: index('forum_posts_discussion_idx').on(table.discussionId), parentIdx: index('forum_posts_parent_idx').on(table.parentId) }))

// ==========================================
// EXAM EVENTS — ASTS/ASAS dan event ujian besar
// ==========================================
export const examEvents = pgTable('exam_events', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: text('type', { enum: ['ASTS', 'ASAS', 'PAS', 'PAT', 'TRYOUT', 'SCHOOL_EXAM'] }).notNull(),
  academicYear: text('academic_year').notNull(),
  semester: text('semester', { enum: ['ganjil', 'genap'] }).notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  description: text('description'),
  status: text('status', { enum: ['draft', 'published', 'closed'] }).notNull().default('draft'),
  createdBy: text('created_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at').notNull().$defaultFn(() => new Date()),
})

// Blok/gelombang waktu ujian: 1 sesi = banyak mapel × banyak kelas (10, 11, 12)
// Jadwal & token proktor ada di sini; examSessions (mapel×kelas) mewarisi jadwalnya.
export const examSesi = pgTable('exam_sesi', {
  id: text('id').primaryKey(),
  eventId: text('event_id').notNull().references(() => examEvents.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), // "Sesi 1"
  openAt: text('open_at').notNull(),
  closeAt: text('close_at').notNull(),
  status: text('status', { enum: ['draft', 'published', 'closed'] }).notNull().default('draft'),
  position: integer('position').notNull().default(0),
  proctorTokenHash: text('proctor_token_hash'),
  proctorTokenPlain: text('proctor_token_plain'),
  proctorTokenPreviousPlain: text('proctor_token_previous_plain'),
  // Rotasi token proktor: 5 menit, grace 2 menit
  proctorTokenNextRotationAt: timestamp('created_at'),
  proctorTokenGraceMinutes: integer('proctor_token_grace_minutes').notNull().default(2),
  createdBy: text('created_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at').notNull().$defaultFn(() => new Date()),
}, (table) => ({ eventSesiIdx: index('exam_sesi_event_idx').on(table.eventId) }))

export const examEventSubjects = pgTable('exam_event_subjects', {
  id: text('id').primaryKey(),
  eventId: text('event_id').notNull().references(() => examEvents.id, { onDelete: 'cascade' }),
  subjectId: text('subject_id').notNull().references(() => subjects.id, { onDelete: 'restrict' }),
  examCourseId: text('exam_course_id').notNull().references(() => courses.id, { onDelete: 'restrict' }),
  activityId: text('activity_id').notNull().references(() => activities.id, { onDelete: 'restrict' }),
  sesiId: text('sesi_id').references(() => examSesi.id, { onDelete: 'restrict' }),
  passingGrade: real('passing_grade').notNull().default(75),
  shuffleQuestions: boolean('is_active').notNull().default(false),
  shuffleOptions: boolean('is_active').notNull().default(false),
  maxAttempts: integer('max_attempts').notNull().default(1),
  durationMinutes: integer('duration_minutes').notNull(),
  tokenHash: text('token_hash').notNull(),
  tokenPlain: text('token_plain'), // plaintext untuk display ke admin/proktor (rotasi)
  tokenPreviousPlain: text('token_previous_plain'), // plaintext lama (grace period)
  // Rotasi token mapel: null = statis, N = rotasi tiap N menit (custom per mapel)
  tokenRotationMinutes: integer('token_rotation_minutes'),
  tokenNextRotationAt: timestamp('created_at'),
  tokenGraceMinutes: integer('token_grace_minutes').notNull().default(2),
  lockEnabled: boolean('is_active').notNull().default(true),
  maxViolations: integer('max_violations').notNull().default(3),
  lockOnClipboard: boolean('is_active').notNull().default(true),
  lockOnFullscreenExit: boolean('is_active').notNull().default(true),
  createdBy: text('created_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at').notNull().$defaultFn(() => new Date()),
}, (table) => ({ eventSubjectIdx: uniqueIndex('exam_event_subject_idx').on(table.eventId, table.subjectId) }))

export const examEventClasses = pgTable('exam_event_classes', {
  eventId: text('event_id').notNull().references(() => examEvents.id, { onDelete: 'cascade' }),
  classId: text('class_id').notNull().references(() => classes.id, { onDelete: 'cascade' }),
}, (table) => ({ eventClassIdx: uniqueIndex('exam_event_class_idx').on(table.eventId, table.classId) }))

// Kelas yang mengikuti mapel tertentu. Kosong berarti mapel tidak memiliki peserta.
export const examEventSubjectClasses = pgTable('exam_event_subject_classes', {
  eventSubjectId: text('event_subject_id').notNull().references(() => examEventSubjects.id, { onDelete: 'cascade' }),
  classId: text('class_id').notNull().references(() => classes.id, { onDelete: 'cascade' }),
}, (table) => ({ subjectClassIdx: uniqueIndex('exam_subject_class_idx').on(table.eventSubjectId, table.classId) }))

export const examSessions = pgTable('exam_sessions', {
  id: text('id').primaryKey(),
  eventId: text('event_id').notNull().references(() => examEvents.id, { onDelete: 'cascade' }),
  eventSubjectId: text('event_subject_id').notNull().references(() => examEventSubjects.id, { onDelete: 'cascade' }),
  sesiId: text('sesi_id').references(() => examSesi.id, { onDelete: 'restrict' }),
  classId: text('class_id').notNull().references(() => classes.id, { onDelete: 'cascade' }),
  openAt: text('open_at').notNull(),
  closeAt: text('close_at').notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
  status: text('status', { enum: ['draft', 'published', 'closed'] }).notNull().default('draft'),
  createdAt: timestamp('created_at').notNull().$defaultFn(() => new Date()),
}, (table) => ({ sessionClassIdx: uniqueIndex('exam_session_class_idx').on(table.eventSubjectId, table.classId) }))

export const examSessionOverrides = pgTable('exam_session_overrides', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => examSessions.id, { onDelete: 'cascade' }),
  studentId: text('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  openAt: text('open_at').notNull(),
  closeAt: text('close_at').notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
  reason: text('reason').notNull(),
  grantedBy: text('granted_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at').notNull().$defaultFn(() => new Date()),
}, (table) => ({ overrideStudentIdx: uniqueIndex('exam_override_student_idx').on(table.sessionId, table.studentId) }))

export const questionPackages = pgTable('question_packages', {
  id: text('id').primaryKey(),
  courseId: text('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  createdBy: text('created_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().$defaultFn(() => new Date()),
}, (table) => ({ nameCourseIdx: uniqueIndex('question_packages_course_name_idx').on(table.courseId, table.name) }))

export const questionBank = pgTable('question_bank', {
  id: text('id').primaryKey(),
  packageId: text('package_id').references(() => questionPackages.id, { onDelete: 'cascade' }),
  scope: text('scope', { enum: ['global', 'category', 'course', 'quiz'] }).notNull(),
  categoryId: text('category_id').references(() => categories.id, { onDelete: 'set null' }),
  courseId: text('course_id').references(() => courses.id, { onDelete: 'cascade' }),
  quizActivityId: text('quiz_activity_id').references(() => activities.id, { onDelete: 'cascade' }),
  createdBy: text('created_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  type: text('type', { enum: ['multiple_choice', 'essay'] }).notNull(),
  question: text('question').notNull(),
  explanation: text('explanation'),
  defaultPoints: real('default_points').notNull().default(1),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().$defaultFn(() => new Date()),
})

export const questionOptions = pgTable('question_options', {
  id: text('id').primaryKey(),
  questionId: text('question_id').notNull().references(() => questionBank.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  text: text('text').notNull(),
  isCorrect: boolean('is_correct').notNull().default(false),
})

export const quizQuestions = pgTable('quiz_questions', {
  id: text('id').primaryKey(),
  activityId: text('activity_id').notNull().references(() => activities.id, { onDelete: 'cascade' }),
  bankQuestionId: text('bank_question_id').references(() => questionBank.id, { onDelete: 'set null' }),
  position: integer('position').notNull(),
  points: real('points').notNull().default(1),
  type: text('type', { enum: ['multiple_choice', 'essay'] }).notNull(),
  question: text('question').notNull(),
  explanation: text('explanation'),
  optionsJson: text('options_json'),
  // Pembatasan soal: JSON array classId. null = berlaku untuk semua kelas peserta quiz.
  targetClassIds: text('target_class_ids'),
})

export const quizAttempts = pgTable('quiz_attempts', {
  id: text('id').primaryKey(),
  activityId: text('activity_id').notNull().references(() => activities.id, { onDelete: 'cascade' }),
  studentId: text('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  attemptNumber: integer('attempt_number').notNull(),
  startedAt: timestamp('created_at').notNull(),
  submittedAt: timestamp('created_at'),
  autoSubmitted: boolean('auto_submitted').notNull().default(false),
  status: text('status', { enum: ['in_progress', 'submitted', 'auto_submitted', 'abandoned', 'needs_grading'] }).notNull().default('in_progress'),
  score: real('score'),
  sessionId: text('session_id').references(() => examSessions.id, { onDelete: 'set null' }),
  lockStatus: text('lock_status', { enum: ['ok', 'locked'] }).notNull().default('ok'),
  lockedAt: timestamp('created_at'),
  lockReason: text('lock_reason'),
  unlockedBy: text('unlocked_by').references(() => users.id, { onDelete: 'set null' }),
  shuffleSeed: integer('shuffle_seed').notNull().default(0),
  // Tracking pelanggaran (akumulatif tidak di-reset saat unlock)
  violationCount: integer('violation_count').notNull().default(0),
  lastUnlockedAt: timestamp('created_at'),
  lastUnlockMethod: text('last_unlock_method'), // 'direct' | 'proctor_token'
  createdAt: timestamp('created_at').notNull().$defaultFn(() => new Date()),
})

export const quizAttemptAnswers = pgTable('quiz_attempt_answers', {
  id: text('id').primaryKey(),
  attemptId: text('attempt_id').notNull().references(() => quizAttempts.id, { onDelete: 'cascade' }),
  quizQuestionId: text('quiz_question_id').notNull().references(() => quizQuestions.id, { onDelete: 'cascade' }),
  selectedOptionId: text('selected_option_id'),
  answerText: text('answer_text'),
  isCorrect: boolean('is_correct'),
  pointsEarned: real('points_earned'),
  gradedBy: text('graded_by').references(() => users.id, { onDelete: 'set null' }),
  gradedAt: timestamp('graded_at'),
  feedback: text('feedback'),
})

// Progress pengerjaan tiap siswa per activity (ringkasan)
export const activityProgress = pgTable('activity_progress', {
  id: text('id').primaryKey(),
  activityId: text('activity_id').notNull().references(() => activities.id, { onDelete: 'cascade' }),
  studentId: text('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  submission: text('submission'),
  // ABC: teks + file + link
  submissionFiles: text('submission_files'),
  submissionLink: text('submission_link'),
  score: real('score'),
  feedback: text('feedback'),
  attemptCount: integer('attempt_count').notNull().default(0),
  bestScore: real('best_score'),
  lastScore: real('last_score'),
  bestAttemptId: text('best_attempt_id'),
  lastAttemptId: text('last_attempt_id'),
  viewedAt: timestamp('viewed_at'),
  completedAt: timestamp('completed_at'),
  submittedAt: timestamp('submitted_at'),
  gradedAt: timestamp('graded_at'),
  isLate: boolean('is_late').notNull().default(false),
  returnedAt: timestamp('returned_at'),
  returnReason: text('return_reason'),
  // Fase 3: kapan nilai dipublish ke siswa
  scorePublishedAt: timestamp('score_published_at'),
  createdAt: timestamp('created_at').notNull().$defaultFn(() => new Date()),
}, (table) => ({ uniqueActivityStudent: uniqueIndex('ap_as_idx').on(table.activityId, table.studentId) }))

// Relation untuk course_grade_weights
export const courseGradeWeightsRelations = relations(courseGradeWeights, ({ one }) => ({
  course: one(courses, { fields: [courseGradeWeights.courseId], references: [courses.id] }),
  creator: one(users, { fields: [courseGradeWeights.createdBy], references: [users.id] }),
}))

// Relation untuk final_grades
export const finalGradesRelations = relations(finalGrades, ({ one }) => ({
  course: one(courses, { fields: [finalGrades.courseId], references: [courses.id] }),
  student: one(students, { fields: [finalGrades.studentId], references: [students.id] }),
  calculatedByUser: one(users, { fields: [finalGrades.calculatedBy], references: [users.id] }),
}))

// Log kejadian saat mengerjakan quiz (exam mode): pindah tab, copy/paste, dll.
export const quizEvents = pgTable('quiz_events', {
  id: text('id').primaryKey(),
  attemptId: text('attempt_id').references(() => quizAttempts.id, { onDelete: 'cascade' }),
  activityId: text('activity_id').references(() => activities.id, { onDelete: 'cascade' }),
  studentId: text('student_id').references(() => students.id, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  type: text('type', { enum: ['tab_switch', 'copy', 'paste', 'cut', 'context_menu', 'focus_lost', 'start', 'submit', 'auto_submit', 'warning', 'lock', 'unlock'] }).notNull(),
  detail: text('detail'),
  createdAt: timestamp('created_at').notNull().$defaultFn(() => new Date()),
}, (table) => ({ attemptIdx: index('quiz_events_attempt_idx').on(table.attemptId) }))

// ==========================================
// EXAM EVENT RELATIONS
// ==========================================
export const examEventsRelations = relations(examEvents, ({ one, many }) => ({
  creator: one(users, { fields: [examEvents.createdBy], references: [users.id] }),
  subjects: many(examEventSubjects),
  classes: many(examEventClasses),
  subjectClasses: many(examEventSubjectClasses),
  sessions: many(examSessions),
  sesi: many(examSesi),
}))

export const examSesiRelations = relations(examSesi, ({ one, many }) => ({
  event: one(examEvents, { fields: [examSesi.eventId], references: [examEvents.id] }),
  creator: one(users, { fields: [examSesi.createdBy], references: [users.id] }),
  subjects: many(examEventSubjects),
  sessions: many(examSessions),
}))

export const examEventSubjectsRelations = relations(examEventSubjects, ({ one, many }) => ({
  event: one(examEvents, { fields: [examEventSubjects.eventId], references: [examEvents.id] }),
  subject: one(subjects, { fields: [examEventSubjects.subjectId], references: [subjects.id] }),
  examCourse: one(courses, { fields: [examEventSubjects.examCourseId], references: [courses.id] }),
  activity: one(activities, { fields: [examEventSubjects.activityId], references: [activities.id] }),
  sesi: one(examSesi, { fields: [examEventSubjects.sesiId], references: [examSesi.id] }),
  creator: one(users, { fields: [examEventSubjects.createdBy], references: [users.id] }),
  subjectClasses: many(examEventSubjectClasses),
  sessions: many(examSessions),
}))

export const examEventSubjectClassesRelations = relations(examEventSubjectClasses, ({ one }) => ({
  eventSubject: one(examEventSubjects, { fields: [examEventSubjectClasses.eventSubjectId], references: [examEventSubjects.id] }),
  class: one(classes, { fields: [examEventSubjectClasses.classId], references: [classes.id] }),
}))

export const examEventClassesRelations = relations(examEventClasses, ({ one }) => ({
  event: one(examEvents, { fields: [examEventClasses.eventId], references: [examEvents.id] }),
  class: one(classes, { fields: [examEventClasses.classId], references: [classes.id] }),
}))

export const examSessionsRelations = relations(examSessions, ({ one, many }) => ({
  event: one(examEvents, { fields: [examSessions.eventId], references: [examEvents.id] }),
  eventSubject: one(examEventSubjects, { fields: [examSessions.eventSubjectId], references: [examEventSubjects.id] }),
  sesi: one(examSesi, { fields: [examSessions.sesiId], references: [examSesi.id] }),
  class: one(classes, { fields: [examSessions.classId], references: [classes.id] }),
  overrides: many(examSessionOverrides),
  attempts: many(quizAttempts),
}))

export const examSessionOverridesRelations = relations(examSessionOverrides, ({ one }) => ({
  session: one(examSessions, { fields: [examSessionOverrides.sessionId], references: [examSessions.id] }),
  student: one(students, { fields: [examSessionOverrides.studentId], references: [students.id] }),
  granter: one(users, { fields: [examSessionOverrides.grantedBy], references: [users.id] }),
}))

// ==========================================
// COURSE RELATIONS
// ==========================================

export const coursesRelations = relations(courses, ({ one, many }) => ({
  creator: one(users, { fields: [courses.createdBy], references: [users.id] }),
  category: one(categories, { fields: [courses.categoryId], references: [categories.id] }),
  subject: one(subjects, { fields: [courses.subjectId], references: [subjects.id] }),
  teachers: many(courseTeachers),
  classes: many(courseClasses),
  sections: many(sections),
}))

export const courseTeachersRelations = relations(courseTeachers, ({ one }) => ({
  course: one(courses, { fields: [courseTeachers.courseId], references: [courses.id] }),
  teacher: one(teachers, { fields: [courseTeachers.teacherId], references: [teachers.id] }),
}))

export const courseClassesRelations = relations(courseClasses, ({ one }) => ({
  course: one(courses, { fields: [courseClasses.courseId], references: [courses.id] }),
  class: one(classes, { fields: [courseClasses.classId], references: [classes.id] }),
}))

export const sectionsRelations = relations(sections, ({ one, many }) => ({
  course: one(courses, { fields: [sections.courseId], references: [courses.id] }),
  activities: many(activities),
}))

export const activitiesRelations = relations(activities, ({ one, many }) => ({
  section: one(sections, { fields: [activities.sectionId], references: [sections.id] }),
  progress: many(activityProgress),
  questions: many(quizQuestions),
  attempts: many(quizAttempts),
  forumDiscussions: many(forumDiscussions),
  forumPosts: many(forumPosts),
}))

export const forumDiscussionsRelations = relations(forumDiscussions, ({ one, many }) => ({
  activity: one(activities, { fields: [forumDiscussions.activityId], references: [activities.id] }),
  creator: one(users, { fields: [forumDiscussions.createdBy], references: [users.id] }),
  posts: many(forumPosts),
}))

export const forumPostsRelations = relations(forumPosts, ({ one }) => ({
  activity: one(activities, { fields: [forumPosts.activityId], references: [activities.id] }),
  discussion: one(forumDiscussions, { fields: [forumPosts.discussionId], references: [forumDiscussions.id] }),
  user: one(users, { fields: [forumPosts.userId], references: [users.id] }),
  student: one(students, { fields: [forumPosts.studentId], references: [students.id] }),
}))

export const questionPackagesRelations = relations(questionPackages, ({ one, many }) => ({
  course: one(courses, { fields: [questionPackages.courseId], references: [courses.id] }),
  creator: one(users, { fields: [questionPackages.createdBy], references: [users.id] }),
  questions: many(questionBank),
}))

export const questionBankRelations = relations(questionBank, ({ one, many }) => ({
  package: one(questionPackages, { fields: [questionBank.packageId], references: [questionPackages.id] }),
  category: one(categories, { fields: [questionBank.categoryId], references: [categories.id] }),
  course: one(courses, { fields: [questionBank.courseId], references: [courses.id] }),
  quiz: one(activities, { fields: [questionBank.quizActivityId], references: [activities.id] }),
  creator: one(users, { fields: [questionBank.createdBy], references: [users.id] }),
  options: many(questionOptions),
}))

export const questionOptionsRelations = relations(questionOptions, ({ one }) => ({
  question: one(questionBank, { fields: [questionOptions.questionId], references: [questionBank.id] }),
}))

export const quizQuestionsRelations = relations(quizQuestions, ({ one, many }) => ({
  activity: one(activities, { fields: [quizQuestions.activityId], references: [activities.id] }),
  bankQuestion: one(questionBank, { fields: [quizQuestions.bankQuestionId], references: [questionBank.id] }),
  answers: many(quizAttemptAnswers),
}))

export const quizAttemptsRelations = relations(quizAttempts, ({ one, many }) => ({
  activity: one(activities, { fields: [quizAttempts.activityId], references: [activities.id] }),
  student: one(students, { fields: [quizAttempts.studentId], references: [students.id] }),
  session: one(examSessions, { fields: [quizAttempts.sessionId], references: [examSessions.id] }),
  answers: many(quizAttemptAnswers),
}))

export const quizAttemptAnswersRelations = relations(quizAttemptAnswers, ({ one }) => ({
  attempt: one(quizAttempts, { fields: [quizAttemptAnswers.attemptId], references: [quizAttempts.id] }),
  question: one(quizQuestions, { fields: [quizAttemptAnswers.quizQuestionId], references: [quizQuestions.id] }),
  grader: one(users, { fields: [quizAttemptAnswers.gradedBy], references: [users.id] }),
}))

export const quizEventsRelations = relations(quizEvents, ({ one }) => ({
  attempt: one(quizAttempts, { fields: [quizEvents.attemptId], references: [quizAttempts.id] }),
  activity: one(activities, { fields: [quizEvents.activityId], references: [activities.id] }),
  student: one(students, { fields: [quizEvents.studentId], references: [students.id] }),
  user: one(users, { fields: [quizEvents.userId], references: [users.id] }),
}))

export const activityProgressRelations = relations(activityProgress, ({ one }) => ({
  activity: one(activities, { fields: [activityProgress.activityId], references: [activities.id] }),
  student: one(students, { fields: [activityProgress.studentId], references: [students.id] }),
}))

export type Course = typeof courses.$inferSelect
export type NewCourse = typeof courses.$inferInsert
export type CourseTeacher = typeof courseTeachers.$inferSelect
export type NewCourseTeacher = typeof courseTeachers.$inferInsert
export type CourseClass = typeof courseClasses.$inferSelect
export type NewCourseClass = typeof courseClasses.$inferInsert
export type Section = typeof sections.$inferSelect
export type NewSection = typeof sections.$inferInsert
export type Activity = typeof activities.$inferSelect
export type NewActivity = typeof activities.$inferInsert
export type ActivityProgress = typeof activityProgress.$inferSelect
export type NewActivityProgress = typeof activityProgress.$inferInsert
export type CourseGradeWeight = typeof courseGradeWeights.$inferSelect
export type NewCourseGradeWeight = typeof courseGradeWeights.$inferInsert
export type FinalGrade = typeof finalGrades.$inferSelect
export type NewFinalGrade = typeof finalGrades.$inferInsert
export type Category = typeof categories.$inferSelect
export type NewCategory = typeof categories.$inferInsert
export type QuestionPackage = typeof questionPackages.$inferSelect
export type NewQuestionPackage = typeof questionPackages.$inferInsert
export type QuestionBank = typeof questionBank.$inferSelect
export type NewQuestionBank = typeof questionBank.$inferInsert
export type QuestionOption = typeof questionOptions.$inferSelect
export type NewQuestionOption = typeof questionOptions.$inferInsert
export type QuizQuestion = typeof quizQuestions.$inferSelect
export type NewQuizQuestion = typeof quizQuestions.$inferInsert
export type QuizAttempt = typeof quizAttempts.$inferSelect
export type NewQuizAttempt = typeof quizAttempts.$inferInsert
export type QuizAttemptAnswer = typeof quizAttemptAnswers.$inferSelect
export type NewQuizAttemptAnswer = typeof quizAttemptAnswers.$inferInsert
export type ExamEvent = typeof examEvents.$inferSelect
export type NewExamEvent = typeof examEvents.$inferInsert
export type ExamSesi = typeof examSesi.$inferSelect
export type NewExamSesi = typeof examSesi.$inferInsert
export type ExamEventSubject = typeof examEventSubjects.$inferSelect
export type NewExamEventSubject = typeof examEventSubjects.$inferInsert
export type ExamEventClass = typeof examEventClasses.$inferSelect
export type NewExamEventClass = typeof examEventClasses.$inferInsert
export type ExamEventSubjectClass = typeof examEventSubjectClasses.$inferSelect
export type NewExamEventSubjectClass = typeof examEventSubjectClasses.$inferInsert
export type ExamSession = typeof examSessions.$inferSelect
export type NewExamSession = typeof examSessions.$inferInsert
export type ExamSessionOverride = typeof examSessionOverrides.$inferSelect
export type NewExamSessionOverride = typeof examSessionOverrides.$inferInsert

export type Setting = typeof settings.$inferSelect
export type NewSetting = typeof settings.$inferInsert