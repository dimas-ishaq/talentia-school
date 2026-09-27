# Fitur Nilai Akhir & Bobot Aktivitas

Fitur ini memungkinkan guru mengatur **bobot nilai per tipe aktivitas** dan menghitung **nilai akhir snapshot** untuk seluruh siswa pada sebuah course, dengan kemampuan re-kalkulasi.

## Konsep Utama

- **Activity-Based**: Course adalah pusat pembelajaran; semua materi, tugas, kuis ada di dalam course.
- **Weighted Scoring**: Bobot persentase per tipe aktivitas (Materi Bacaan, File, Video, Kuis, Tugas, Forum, Presentasi).
- **Snapshot**: Nilai akhir disimpan sebagai snapshot yang dapat dihitung ulang kapan saja.
- **Letter Grade**: Skor 0–100 → A/B/C/D/E.
- **Feedback Opsional**: Guru dapat memberi catatan untuk setiap student dan submission.

## Database Schema

### Tabel Baru

1. **`course_grade_weights`** – Konfigurasi bobot per course
   - `weights_json`: JSON object `{ "quiz": 40, "assignment": 30, ... }`
   - Diatur oleh guru saat pertama kali membuat course.
2. **`final_grades`** – Snapshot nilai akhir per student
   - `score`: 0–100
   - `grade`: Letter grade (A/B/C/D/E)
   - `componentsJson`: Rincian komponen per tipe
   - `feedback`: Catatan guru (opsional)
   - `version`: Versi snapshot (increment saat re-kalkulasi)

### Kolom Baru

- **`activity_progress.feedback`** – Feedback per submission (opsional).

## API Endpoints

### Konfigurasi Bobot

```typescript
// GET /api/courses/[id]/grade-weights
// { data: { weights: {...}, types: [...] } }

// PUT /api/courses/[id]/grade-weights
// Body: { weights: { quiz: 40, assignment: 30, ... }, isActive: true }
// Total bobot harus 100%
```

### Perhitungan Nilai Akhir

```typescript
// GET /api/courses/[id]/final-grades
// { data: [{ studentName, score, grade, feedback, componentsJson, calculatedAt, version }] }

// POST /api/courses/[id]/final-grades/calculate
// Body: { weightsOverride: {...} } | {} // Kosong = gunakan bobot tersimpan
// Response: { success: true, data: { version, count } }

// PATCH /api/courses/[id]/final-grades/[studentId]
// Body: { feedback: string|null }
```

### Penilaian Submission (Assignment/Forum)

```typescript
// POST /api/courses/[id]/activities/[activityId]/grade
// Body: { studentId, score, feedback }
// score: 0..maxScore (maxPoint untuk quiz, points untuk assignment)
```

### Progress Siswa (dengan late detection)

```typescript
// GET /api/courses/[id]/progress
// Setiap progress memiliki field tambahan:
// - late: boolean (submitedAfterDueDate)
// - submittedAt: timestamp | null
// - feedback: string | null
```

## UI Components

### 1. CourseGradesView (`/dashboard/courses/[id]/grades`)

Guru dapat:
- Mengatur bobot per tipe aktivitas.
- Klik **"Re-kalkulasi"** untuk hitung ulang nilai akhir.
- Lihat tabel nilai akhir seluruh siswa + feedback.
- Edit feedback langsung dari tabel.

### 2. CoursePendingGradingView (`/dashboard/courses/[id]/grading`)

Inbox penugasan yang perlu dikoreksi:
- Daftar submission (assignment/forum) yang belum dinilai.
- Modal grading: input nilai + feedback.
- Indikator **Terlambat** jika submit setelah deadline.

### 3. Updated CourseDetailView

Siswa melihat:
- **Nilai Akhir** section (jika sudah dihitung):
  - Skor, letter grade, rincian komponen, catatan guru.

Guru melihat:
- Link **"Konfigurasi Bobot & Nilai Akhir"**.
- Link **"Koreksi Submission"**.
- Progress table dengan indikator **late**.

### 4. Global Pages

- `/dashboard/grades` – List courses (teacher/admin) atau my courses (student).
- `/dashboard/grading` – List courses untuk inbox koreksi global.

## Workflow Penggunaan

### Guru

1. Buat course + tambahkan sections & activities.
2. Buka **Konfigurasi Bobot & Nilai Akhir**:
   - Isi bobot total 100%.
   - Simpan.
3. Saat ada submission:
   - Dari **Progress**, klik cell `/=` → modal grading.
   - Dari halaman **Koreksi Submission**, buka modal.
   - Input nilai & feedback.
4. Klik **Re-kalkulasi** untuk update nilai akhir.

### Siswa

1. Tampilkan course detail → lihat **Progress Course** (persentase).
2. Setelah guru menghitung:
   - Tampilkan **Nilai Akhir** section (skor + letter grade + komponen).
   - Lihat feedback guru (jika ada).

## Late Submission

- Activity bisa diatur `dueDate`.
- Jika `submittedAt > dueDate` → flag `late=true`.
- Di UI: sel berwarna merah, tooltip "Dikumpulkan terlambat".

## Letter Grade Scale

| Score  | Grade |
|--------|-------|
| 90–100 | A     |
| 80–89  | B     |
| 70–79  | C     |
| 60–69  | D     |
| < 60   | E     |

## Migration Script

Run migration script untuk membuat tabel baru & kolom:

```bash
npm run db:migrate:final-grades
```

Output akan menampilkan tabel yang dibuat.

## Catatan Implementasi

- **Bobot dinormalisasi**: Hanya komponen dengan aktivitas bernilai yang dihitung total weight, sehingga komponen kosong tidak menggeser hasil.
- **Deadline preservation**: Feedback dipertahankan saat re-kalkulasi snapshot.
- **Max score per type**: Quiz menggunakan `maxPoint`, assignment menggunakan `points`, default 100.
- **Permission**: Teacher/Admin only untuk grading & configuration.

## Menu Updates

Guru menu:
- ✅ **Course** (pusat)
- ✅ **Jadwal**
- ✅ **Kalender Akademik**
- ✅ **Paket Soal**
- ✅ **Koreksi Tugas** → link ke course list
- ✅ **Nilai Akhir** → link ke course list

Removed placeholder menus: Materi, Tugas, Kuis.

Siswa menu:
- ✅ **Course Saya**
- ✅ **Jadwal**
- ✅ **Kalender Akademik**
- ✅ **Ujian** (exam events)
- ✅ **Nilai Saya**
- ✅ **Progress**

Removed placeholder menus: Tugas Aktif, Sudah Dikumpul, Kuis.

---

## Next Steps (Opsional)

- Aggregate inbox across all courses (global pending grading).
- Export grades to CSV/PDF.
- Grade distribution analytics per course.
- Weight templates for common scenarios.
