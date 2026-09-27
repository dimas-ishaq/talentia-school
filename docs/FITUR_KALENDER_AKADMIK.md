# Fitur Kalender Akademik — Dokumentasi

## Gambaran Umum

**Kalender Akademik** adalah sistem manajemen agenda pembelajaran sekolah yang meliputi:
- Ujian dan asesmen
- Hari libur nasional & sekolah
- Kegiatan ekstrakurikuler & event sekolah
- Rapat guru & orang tua siswa
- Kompetisi & lomba akademik/non-akademik
- Awal/akhir semester & periode libur

### Peran Akses
- **Admin**: CRUD penuh (tambah/edit/hapus) + kontrol visibilitas publik/internal/private
- **Guru**: Tampilan kalender hanya agenda publik & internal
- **Siswa**: Tampilan kalender untuk semua agenda publik
- **Orang Tua**: Akses ke agenda publik saja

## Tipe Agenda

| Tipe | Label | Warna | Ikon | Libur? |
|------|-------|-------|------|--------|
| `exam` | Ujian / Asesmen | Red (#ef4444) | Beaker | ❌ |
| `holiday` | Hari Libur | Pink (#f43f5e) | Sun | ✅ |
| `activity` | Kegiatan Sekolah | Green (#10b981) | Sparkles | ❌ |
| `meeting` | Rapat / Raker | Indigo (#6366f1) | User Group | ❌ |
| `competition` | Lomba / Kompetisi | Amber (#f59e0b) | Trophy | ❌ |
| `semester_start` | Awal Semester | Cyan (#0ea5e9) | Play Circle | ❌ |
| `semester_end` | Akhir Semester | Violet (#8b5cf6) | Flag | ❌ |
| `break` | Libur Semester | Teal (#14b8a6) | Academic Cap | ✅ |
| `other` | Lainnya | Slate (#64748b) | Calendar Days | ❌ |

## Database Schema

Tabel: `calendar_events`

```sql
- id              : TEXT PRIMARY KEY          -- UUID unik
- title           : TEXT NOT NULL             -- Judul agenda
- description     : TEXT                      -- Deskripsi panjang (opsional)
- start_date      : TEXT NOT NULL             -- YYYY-MM-DD, wajib
- end_date        : TEXT                      -- YYYY-MM-DD, NULL jika 1 hari
- location        : TEXT                      -- Lokasi/ruangan (opsional)
- type            : TEXT DEFAULT 'other'      -- Enum tipe agenda
- category        : TEXT                      -- Kategori manual (misal "Nasional", "Ekstrakurikuler")
- isHoliday       : INTEGER DEFAULT 0         -- Menandai hari libur
- visibility      : TEXT DEFAULT 'public'     -- public | internal | private
- color           : TEXT                      -- Hex warna custom (auto dari type)
- created_by      : TEXT REFERENCES users(id) -- Admin pembuat
- created_at      : INTEGER                   -- Timestamp saat dibuat
- updatedAt       : INTEGER                   -- Timestamp saat di-update
```

## Cara Menggunakan

### 1. Persiapan Database

Jalankan migration untuk menambahkan kolom-kolom baru:

```bash
npm run db:migrate:calendar
```

Migration akan:
- Menambahkan kolom `type`, `category`, `isHoliday`, `visibility`, `color`, `updated_at`
- Membuat index pada `start_date` & `type`
- Tetap aman untuk database existing dengan data

### 2. Tambah Agenda (Admin)

1. Login sebagai **admin**
2. Masuk menu: **Komunikasi → Kalender**
3. Klik tombol **+ Tambah Agenda**
4. Isi form:
   - Judul agenda (wajib, max 200 karakter)
   - Jenis agenda (dropdown)
   - Kategori (opsional, misal "Eksternal", "Internal", "Sekolah")
   - Tanggal mulai (wajib)
   - Tanggal selesai (opsional, untuk acara > 1 hari)
   - Lokasi (opsional)
   - Visibilitas:
     * Public → tampil ke semua pengguna
     * Internal → tampil ke admin & guru
     * Private → tampil ke admin saja
   - Deskripsi (opsional, bisa banyak)
   - Checkbox "Menandai hari libur"
5. Simpan

**Validasi otomatis:**
- Tanggal selesai tidak boleh lebih awal dari tanggal mulai
- Format tanggal harus valid
- Warna otomatis disesuaikan dengan jenis, bisa diubah manual

### 3. Lihat Kalender (Semua Role)

Calendar view menampilkan:
- **Grid bulanan** interaktif
- **Agenda berwarna** di tiap tanggal
- **Filter jenis agenda** (dropdown)
- **Navigasi bulan** (prev/current/next)
- **List agenda** di bawah grid detail per event

Double-click tanggal untuk tambah cepat (hanya admin).

### 4. Edit/Hapus Agenda (Hanya Admin)

Di list agenda bagian bawah:
- **Edit** → modifikasi data
- **Hapus** → konfirmasi lalu hapus permanen

## API Endpoints

### GET `/api/calendar`

Ambil daftar agenda dengan filter rentang tanggal dan tipe.

**Query Parameters:**
- `from=YYYY-MM-DD` → rentang awal
- `to=YYYY-MM-DD` → rentang akhir
- `type=exam|holiday|...` → filter jenis
- `includeInternal=1` → ikut agenda internal (admin/guru)
- `includePrivate=1` → ikut agenda privat (admin)

**Response:**
```json
{
  "data": [
    {
      "id": "...",
      "title": "Ujian Tengah Semester",
      "description": "UTS Genap 2025/2026",
      "startDate": "2025-11-01",
      "endDate": "2025-11-05",
      "location": "Ruang Kelas",
      "type": "exam",
      "category": "Akademik",
      "isHoliday": false,
      "visibility": "internal",
      "color": "#ef4444",
      "creator": { "name": "Budi Admin" }
    }
  ]
}
```

### POST `/api/calendar`

Tambah agenda baru (admin-only).

**Body:**
```json
{
  "title": "Ulangan Harian",
  "description": "Bab Aljabar",
  "startDate": "2025-10-10",
  "endDate": "2025-10-10",
  "location": "Lab Komputer",
  "type": "exam",
  "category": "Matematika",
  "isHoliday": false,
  "visibility": "public",
  "color": null
}
```

**Response:** `{ "success": true, "data": { ...created_event } }`

### PATCH `/api/calendar/:id`

Edit agenda (admin-only). Semua field opsional kecuali title.

### DELETE `/api/calendar/:id`

Hapus agenda (admin-only).

---

## Contoh Penggunaan

### Jadwal Ujian Nasional

```javascript
// Admin membuat ujian nasional
await $fetch('/api/calendar', {
  method: 'POST',
  body: {
    title: 'Ujian Nasional 2025/2026',
    startDate: '2026-03-15',
    endDate: '2026-03-20',
    type: 'exam',
    category: 'Nasional',
    isHoliday: false,
    visibility: 'public'
  }
})
```

### Libur Semester

```javascript
await $fetch('/api/calendar', {
  method: 'POST',
  body: {
    title: 'Libur Semester Ganjil',
    startDate: '2025-12-20',
    endDate: '2026-01-10',
    type: 'break',
    isHoliday: true,
    visibility: 'public'
  }
})
```

### Filter Kalender Bulan Ini

```javascript
const month = new Date()
const from = `${month.getFullYear()}-${String(month.getMonth()+1).padStart(2,'0')}-01`
const to = `${month.getFullYear()}-${String(month.getMonth()+1).padStart(2,'0')}-31`

const events = await $fetch(`/api/calendar?from=${from}&to=${to}`)
```

---

## Catatan Kurikulum

Sebagai kurikulum expert, fitur ini dirancang untuk:

1. **Struktur Akademik Jelas** — Memisahkan tipe ujian, libur, kegiatan dengan kode warna spesifik memudahkan monitoring periodisasi akademik.

2. **Integrasi Dengan Schedule** — Kalender dapat disinkronkan dengan jadwal pelajaran (`/dashboard/schedule`) untuk melihat bentrok atau empty time.

3. **Fleksibilitas Kategori** — Guru/admin dapat memasukkan kategori custom untuk filter lanjutan (misal "Nasional", "Regional", "Internal").

4. **Visibilitas Granular** — Pengaturan visibilitas memastikan kerahasiaan tertentu (agenda rapat dewan guru, dll) tetap privat sementara pengumuman ke publik.

5. **Skalabilitas Masa Depan** — Struktur ready untuk integrasi dengan:
   - Notifikasi email/push untuk upcoming events
   - Export ke Google Calendar/iCal
   - Reminders H-3, H-1 sebelum event

---

## Migrasi & Setup

Jika sudah ada data lama di `calendar_events`:

```bash
npm run db:migrate:calendar
```

Untuk reset database & mulai fresh:

```bash
npm run db:reset
npm run db:migrate:calendar
```

Data seed awal dapat ditambahkan ke `server/database/seed.ts` untuk testing.

---

## Troubleshooting

**Kolom baru tidak muncul setelah migration?**
Pastikan file `local.db` bukan read-only dan migration script dijalankan sebagai user yang memiliki write permission.

**Tidak bisa tambah agenda?**
Periksa role user (harus admin), format tanggal valid, dan pastikan tanggal selesai >= tanggal mulai.

**Agenda internal tidak muncul untuk guru?**
Pastikan query menggunakan `includeInternal=1`. Component frontend secara default fetch agenda sesuai role user.

---

Dokumentasi ini ditulis oleh Tim Kurikulum, September 2025. Untuk pertanyaan teknis, hubungi developer lead.
