# Fitur Jadwal Pelajaran - Dokumentasi

## Gambaran Umum

Fitur jadwal pelajaran untuk sistem sekolah dengan role-based access:
- **Admin**: CRUD penuh jadwal (tambah/edit/hapus/aktifkan-nonaktifkan) + filter lengkap
- **Guru**: Lihat jadwal mengajar yang diampu (read-only)
- **Siswa**: Lihat jadwal kelasnya sendiri (read-only)

## Tabel Database Baru

**Tabel:** `schedule_entries`

```sql
- id              : TEXT PRIMARY KEY (UUID)
- day_of_week     : INTEGER NOT NULL (1-6: Senin-Sabtu)
- start_time      : TEXT NOT NULL (HH:MM format)
- end_time        : TEXT NOT NULL (HH:MM format)
- subject_id      : TEXT FK references subjects(id) ON DELETE RESTRICT
- class_id        : TEXT FK references classes(id) ON DELETE CASCADE
- teacher_id      : TEXT FK references teachers(id) ON DELETE SET NULL
- room            : TEXT nullable (opsional)
- note            : TEXT nullable (opsional)
- is_active       : INTEGER DEFAULT 1 (boolean)
- created_by      : TEXT FK references users(id) ON DELETE RESTRICT
- created_at      : INTEGER DEFAULT NOW()
```

**Index:**
- `schedule_class_day_idx`: `(class_id, day_of_week)` untuk query cepat per kelas
- `schedule_teacher_day_idx`: `(teacher_id, day_of_week)` untuk query cepat per guru

## Cara Menggunakan

### 1. Jalankan Migration

```bash
node node_modules/tsx/dist/cli.mjs scripts/migrate-schedules.ts
```

Atau tambahkan ke package.json jika belum:
```json
"db:migrate:schedules": "tsx scripts/migrate-schedules.ts"
```

Lalu jalankan:
```bash
npm run db:migrate:schedules
```

### 2. Tambah Jadwal (Admin)

1. Login sebagai admin
2. Masuk menu: **Akademik → Jadwal**
3. Klik tombol **Tambah Jadwal**
4. Isi form:
   - Hari (Senin-Sabtu)
   - Jam mulai dan jam selesai
   - Mata pelajaran
   - Kelas (siswa apa yang ikut)
   - Guru pengajar
   - Ruangan (opsional)
   - Catatan (opsional)
5. Simpan

**Validasi yang berjalan:**
- Jam selesai > jam mulai
- Tidak bentrok dengan guru lain (hari + jam sama)
- Tidak bentrok dengan kelas yang sama (hari + jam sama)
- Data wajib diisi

### 3. Edit/Hapus Jadwal (Admin Only)

- Di tabel, klik tombol **Edit** atau **Hapus**
- Edit mengubah hari/jam/mapel/guru/kelas
- Hapus permanen menghapus data (tidak ada undo kecuali restore DB)
- Bisa nonaktifkan (toggle switch) tanpa menghapus data

### 4. Lihat Jadwal (Guru & Siswa)

#### Untuk Guru
1. Login sebagai guru
2. Menu: **Pembelajaran → Jadwal**
3. Tab hari (Senin-Sabtu) untuk navigasi
4. Kartu menampilkan: mapel, kelas, jam, ruangan

Filter yang tersedia:
- Toggle status: Semua / Aktif saja

#### Untuk Siswa
1. Login sebagai siswa
2. Menu: **Belajar → Jadwal**
3. Tab hari otomatis aktif = hari ini (Senin-Sabtu)
4. Kartu menampilkan: mapel, kelas, guru, ruangan, catatan

Filter yang tersedia:
- Toggle status: Semua / Aktif saja

## API Endpoints

### GET `/api/schedules`

Role-aware fetch jadwal:

| Role    | Filter                                      |
|---------|---------------------------------------------|
| Admin   | Semua jadwal (filter hari/kelas/guru opsional) |
| Guru    | Hanya jadwal mengajar dirinya               |
| Siswa   | Hanya jadwal kelasnya                       |

**Query params:**
- `dayOfWeek` (number, 1-6): filter hari tertentu
- `classId` (string UUID): filter kelas tertentu
- `teacherId` (string UUID): filter guru tertentu
- `showInactive` (0/1): false = hanya jadwal aktif (admin only)

Response:
```json
{
  "data": [
    {
      "id": "...",
      "dayOfWeek": 1,
      "startTime": "07:00",
      "endTime": "08:30",
      "subjectId": "...",
      "subjectName": "Matematika",
      "subjectCode": "MTK",
      "classId": "...",
      "className": "11 RPL 1",
      "teacherId": "...",
      "teacherName": "Budi Santoso",
      "room": "Lab IPA",
      "note": null,
      "isActive": true
    }
  ],
  "meta": {
    "minDay": 1,
    "maxDay": 6
  }
}
```

### POST `/api/schedules` (Admin Only)

Add new schedule entry:

```json
{
  "dayOfWeek": 1,
  "startTime": "07:00",
  "endTime": "08:30",
  "subjectId": "uuid",
  "classId": "uuid",
  "teacherId": "uuid",
  "room": "Lab IPA",
  "note": ""
}
```

Response: `{ success: true, data: ScheduleEntry }`

Error: 409 Conflict bila bentrok.

### PATCH `/api/schedules/:id` (Admin Only)

Update schedule entry:

```json
{
  "dayOfWeek": 2,
  "startTime": "09:00",
  "endTime": "10:30",
  ...
}
```

All fields optional except ID in URL.

### DELETE `/api/schedules/:id` (Admin Only)

Remove schedule entry permanently.

## Validasi Bentrok

Backend melakukan validasi saat POST/PATCH:

1. **Jam harus valid**: `end_time > start_time`
2. **Guru bentrok**: Jika guru sudah mengajar di hari+jam yang sama
3. **Kelas bentrok**: Jika kelas sama di hari+jam yang sama

Contoh bentrok:
- Senin 07:00–08:30: Guru A mengajar kelas X
- Mau tambah: Senin 07:00–08:30: Guru A mengajar kelas Y ❌ Gagal

## Komponen yang Dibuat

1. `AdminScheduleView.vue` — CRUD admin + filter + toast
2. `StudentScheduleView.vue` — Read-only per hari untuk siswa
3. `TeacherScheduleView.vue` — Read-only per hari untuk guru
4. `ScheduleFormModal.vue` — Modal form tambah/edit (shared)
5. `useSchedules()` — Composable unified logic

## File yang Dibuat/Diedit

### Created
- `server/database/schema.ts` — Added `scheduleEntries` table + relations + types
- `scripts/migrate-schedules.ts` — Database migration script
- `server/utils/schedule.ts` — Utility time validation & conflict detection
- `server/api/schedules/index.get.ts`
- `server/api/schedules/index.post.ts`
- `server/api/schedules/[id].patch.ts`
- `server/api/schedules/[id].delete.ts`
- `app/types/schedule.ts`
- `app/composables/useSchedules.ts`
- `app/components/features/schedules/AdminScheduleView.vue`
- `app/components/features/schedules/StudentScheduleView.vue`
- `app/components/features/schedules/TeacherScheduleView.vue`
- `app/components/features/schedules/ScheduleFormModal.vue`
- `app/pages/dashboard/(academic)/schedule/index.vue`

### Edited
- `app/composables/useMenu.ts` — Add "Jadwal" menu item
- `package.json` — Add `db:migrate:schedules` npm script

## Type Check

```bash
npx vue-tsc --noEmit
```

Semua file type-safe dengan TypeScript.

## Next Steps (Optional Improvements)

Fitur yang bisa ditambahkan nanti:

1. **Import Excel** — Bulk import jadwal dari file CSV/XLSX
2. **Template jadwal** — Salin jadwal antar kelas
3. **Riwayat semester** — Add field `semester`, `tahunAjaran`
4. **Notifikasi perubahan** — Alert guru/siswa jika jadwal berubah
5. **Drag-and-drop calendar UI** — Visual scheduling lebih baik
6. **Jadwal pengganti** — Field `replacedBy` untuk ganti jadwal sementara
7. **Rekap jam mengajar** — Stats total jam mengajar per guru

Tapi untuk MVP (minimum viable product), fitur di atas sudah cukup!

---

**Versi:** 1.0  
**Tanggal Implementasi:** 2026-09-23  
**Status:** Production Ready ✅
