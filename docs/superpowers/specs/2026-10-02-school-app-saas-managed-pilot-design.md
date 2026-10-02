# Spec: School-App SaaS — Managed Pilot (Per-Siswa/Bulan)

**Date:** 2026-10-02
**Status:** Draft — pending user review before plan
**Scope:** Jalur A (managed pilot). Fix kebocoran tenant + migrasi Postgres + operasional manual. Tarif **per siswa aktif / bulan**, invoice manual di luar app.

## 1. Intent & Success Criteria

**Outcome yang diminta:** audit apakah layak jual sebagai SaaS. Hasil: layak pilot managed 1–3 sekolah, belum self-service.

**Pembeli pertama:** sekolah yang di-onboard manual oleh operator (bukan daftar sendiri). Harga = `Rp X × jumlah siswa aktif` per bulan.

**Lulus pilot jika:**
- Sekolah A tidak bisa baca/ubah data sekolah B (IDOR 0).
- `docker compose up` fresh Postgres sukses tanpa `ALTER TABLE` manual.
- `pg_dump` → restore → `integrity check` sukses, ada runbook.
- Operator bisa buat sekolah baru + import siswa tanpa `db:seed`/`db:reset`.
- Tagihan bulanan = `COUNT(students WHERE organization_id = :org AND status aktif)` konsisten.

**Non-goal pilot:** gateway pembayaran, trial automation, custom domain/white-label, RLS, multi-campus, SSO, laporan negara penuh.

## 2. Current State (grounded — file:line)

- Tenant di TS ada, di migrasi belum. `server/database/schema.sqlite.ts:5` `organizations` + `organizationId` di 14 tabel (users, teachers, parents, students, classes, subjects, announcements, attendance, calendar_events, schedule_entries, settings, categories, courses, exam_events). Tapi `drizzle/0000_massive_korath.sql:539` Postgres masih single-tenant, `drizzle-postgresql/.gitkeep` kosong.
- Isolasi runtime ditambal `server/utils/db.ts:33-60` (`ALTER TABLE ADD COLUMN` + backfill) — hanya SQLite. `server/middleware/` kosong, guard hanya per-handler `requireOrganization` (`server/utils/tenant.ts:7`).
- ~30 endpoint list/detail tanpa `eq(organizationId)` — contoh bocor terverifikasi: `server/api/students/[id].get.ts:30`, `server/api/courses/[id].get.ts:11,36`, `server/api/exam-events/index.get.ts:16`, `server/api/question-bank/index.get.ts:19`. Pola sama diduga di `subjects/[id].*`, `schedules/[id].*`, `question-packages/[id].*`, `student/exam-sessions*`.
- Unique global: `subjects.code/name` (`schema.sqlite.ts:145-146`), `courses.name:445`, `categories.name:430`, `teachers.code/nip:537`, `students.nis:511`, `settings.key:301` — collision antar tenant.
- Billing: hanya `organizations.status enum trial/active/past_due/suspended/cancelled` (`schema.sqlite.ts:9`), `trial` lolos di `tenant.ts:18`. Tidak ada `plans/subscriptions`.
- Provisioning: `server/api/auth/register.post.ts:55` bikin org kosong; `server/database/seed.ts:42` hardcode `org_demo` + `password123`; `scripts/db-reset.ts` destruktif.
- Ops: backup cuma SQLite (`scripts/backup-db.ts` `copyFileSync`); Postgres volume tanpa backup job; rate-limit in-memory `Map` (`server/utils/authRateLimit.ts:3`); log `console.*`; `app/pages/auth/register.vue` Terms `href="#"`.

## 3. Architecture — Pilot A (minimal diff)

```
Operator (kamu) ──► POST /api/organizations (manual) ──► organizations + organizationMembers
                    POST /api/teachers/import, /students/import ──► siswa/guru per org

App (Nuxt 4) ──► requireOrganization(event) ──► every /api/* query WHERE organization_id = :org
Postgres 16 (docker-compose db) ◄── drizzle-postgresql/migrations (versioned, bukan ALTER runtime)
Backup sidecar: cron pg_dump → local + (opsional S3) → backup-verify
```

Prinsip: **tidak ada tabel billing baru pilot.** Harga per-siswa dihitung dari `students` — bukan dari subscription engine.

## 4. Components & Changes

### 4.1 Tenant Isolation (P0)

**Rule:** setiap `server/api/**` yang menyentuh tabel ber-`organizationId` wajib filter itu. Tabel tanpa `organizationId` (grades, sections, activities, questionBank, quizAttempts, dll) wajib filter via join ke parent ber-`organizationId` (courses/sections → organizationId).

**Fix pattern (1 baris per query):**
```ts
// sebelum
.where(eq(students.id, id))
// sesudah
.where(and(eq(students.id, id), eq(students.organizationId, organization.id)))
// list
.where(and(eq(courses.organizationId, organization.id), ...filters))
```

**File wajib diaudit (checklist — generated dari grep):**

- `server/api/students/[id].get|patch|delete`, `server/api/subjects/[id].*`, `server/api/schedules/[id].*`
- `server/api/courses/[id].get.ts:36`, `server/api/question-bank/**`, `server/api/question-packages/[id].*`
- `server/api/exam-events/index.get.ts:16`, `server/api/exam-events/[id]/**`, `server/api/student/exam-sessions*`, `server/api/quizzes/attempts/*`
- `server/api/dashboard/student-stats.get.ts`, `teacher-stats.get.ts` (cek vs `stats.get.ts:9` yang sudah benar)

**Composite unique (ganti `unique()` → `uniqueIndex().on(organizationId, key)`):**
- `subjects` (`code`, `name`), `courses` (`name`), `categories` (`name`), `teachers` (`code`,`nip`), `students` (`nis`), `settings` (`key` → `(organization_id, key)`)

**Tambahan guard (opsional tapi murah):**
- `server/middleware/tenant.ts` global untuk `/api/*` (allowlist: `/api/auth/login|register|health`) — ponytail: ganti Nitro routeRules + RLS when >10 orgs.

**Test:** satu file `tests/tenant-isolation.test.ts` (assert-based, tanpa framework baru — pakai `node:test` atau `vitest` jika sudah ada; jika belum, `scripts/test-tenant-isolation.ts` dengan `assert`). Buat 2 org (A/B), coba fetch silang — expect 404/403.

### 4.2 Migration Pipeline (P0)

- `npx drizzle-kit generate` dari `schema.postgres.ts` → commit ke `drizzle-postgresql/` (bukan `.gitkeep`). `drizzle.config.ts:7` sudah switch by `DATABASE_URL`.
- `docker-compose.yml`: tambah service `migrate` (`depends_on: db healthy`, `command: npx drizzle-kit migrate` atau `drizzle-kit push` idempoten) **atau** entrypoint app yang jalankan migrate sebelum `node .output/server/index.mjs`.
- Hapus ketergantungan `server/utils/db.ts:19-60` sebagai sumber kebenaran Postgres. Sisa `ALTER TABLE` SQLite boleh stay sebagai kompat dev lokal, tapi Postgres wajib lewat migration versioned.
- `POSTGRESQL.md` + `docs/` runbook: urutan `compose up -d db → migrate → app`.

**Verify:** `docker compose down -v && docker compose up --build` fresh DB → tabel `organizations` & `organization_id` ada, login/register sukses.

### 4.3 Provisioning Manual (P1 — tanpa wizard)

- Operator buat sekolah: `POST /api/auth/register` (org baru) atau endpoint admin `POST /api/organizations` (jika belum ada). Tidak buat `org_demo`.
- Data awal: import CSV guru/siswa/mapel via modal yang sudah ada (`teachers/import.post.ts`, `students/import.post.ts`). Tidak ada template tahun ajaran otomatis pilot.
- `server/database/seed.ts` diberi guard `if (process.env.NODE_ENV === 'production') throw` + ganti password demo ke random/log-only.
- `scripts/db-reset.ts` diberi guard `if DATABASE_URL startsWith postgres → abort`.

### 4.4 Billing Manual Per-Siswa/Bulan (P1 — tanpa gateway)

**Definisi tagihan:** `bill = count(siswa aktif di org) × harga_satuan`. Snapshot akhir bulan (atau tanggal invoice yang disepakati).

**Query kanonik (satu-satunya sumber hitungan).** Kolom status siswa = `students.is_active` (boolean, default true — `schema.sqlite.ts`, "false = akun tidak bisa login & disembunyikan dari filter Aktif"). Kunci unik `students.nis` global harus jadi composite lebih dulu sebelum 2+ sekolah masuk:
```sql
SELECT COUNT(*) FROM students WHERE organization_id = :org AND is_active = true
```

Disimpan sebagai util `server/utils/billing.ts`:
```ts
export async function countBillableStudents(organizationId: string) { /* ponytail: add proration/pause when needed */ }
```

**Tidak dibangun pilot:** tabel `subscriptions/invoices/payments`, webhook, cron trial expiry. Operator hitung manual (spreadsheet atau `SELECT` langsung), invoice manual (transfer). Status bayar dicatat di luar app (atau kolom `organizations.status` diubah manual `active ↔ past_due`).

**Enforce minimal:** `server/utils/tenant.ts:18` tetap blokir `suspended/cancelled`; `past_due` masih lolos pilot (operator follow-up manual). `trial` boleh lolos — pilot tidak pakai trial expiry.

**Siap upgrade B:** tambah `organizations: plan,trialEndsAt,seatLimit` + halaman `/dashboard/billing` read-only (count + harga) — add when self-service.

### 4.5 Ops Minimal

- **Backup Postgres:** `scripts/backup-pg.sh` (`pg_dump --format=custom $DATABASE_URL > backups/pg-$(date -I).dump`) + cron (host atau sidecar). `docker-compose.yml` tambah volume `backups` + mount ke `app`. `scripts/backup-verify.ts` tambah path `pg_restore --list`.
- **Restore runbook:** `docs/POSTGRESQL.md` langkah `pg_restore`.
- **Uploads:** volume `uploads:/app/public/uploads` sudah ada — tambah ke backup job (tar).
- **Rate-limit/log:** tidak diganti pilot (stay `Map` + `console`). Catat di runbook: single replica pilot; ganti Redis/pino when scale.

### 4.6 Legal & Demo Hygiene

- Ganti `href="#"` di `app/pages/auth/register.vue` dan `app/pages/index.vue` ke `/terms`, `/privacy` stub (markdown statis). Isi placeholder: kontak operasional + kebijakan data + retensi.
- `NUXT_PUBLIC_SHOW_DEMO_ACCOUNTS=false` di `.env.example:13` sudah benar — pastikan `.env` produksi tidak set `true`.
- Demo seed hanya jalan di `NODE_ENV !== production`.

## 5. Data Flow — Tagihan Per-Siswa

```
Siswa dibuat (import/manual) → students.organization_id = org.id
                                   │
Akhir bulan → countBillableStudents(org.id) → operator lihat angka → invoice manual
                                   │
Bayar? ── ya ──► organizations.status = 'active' (manual)
       └── tidak ──► status = 'past_due' → follow-up → 'suspended' (manual, diblokir tenant.ts)
```

## 6. Error Handling

- IDOR: balikan `404` (bukan 403) untuk `[id]` lintas org — jangan bocorkan keberadaan data.
- Migrasi gagal: app tidak start (migrate service exit non-zero).
- Backup gagal: `console.error` + exit code non-zero cron.

## 7. Testing

- **Wajib:** `tenant-isolation` test (2 org, cross-fetch expect 404/403, collision unique antar org sukses).
- **Wajib:** fresh Postgres compose test (manual runbook, sekali per release).
- **Wajib:** `pg_dump` + `pg_restore --list` sukses.
- Skip: E2E billing automation, load test.

## 8. Risks & Mitigations

- Lupa filter tenant di endpoint baru → checklist + test isolasi + (opsional) middleware global.
- Drift SQLite vs Postgres → generate dua migrasi terpisah, CI cek `drizzle-kit check`.
- Harga per-siswa dispute (siswa keluar mid-month) → definisi snapshot akhir bulan tertulis di Terms.

## 9. Out of Scope (eksplisit tidak dikerjakan)

Self-service checkout, Midtrans/Xendit/Stripe, trial expiry automation, seatLimit enforcement, custom domain/subdomain, white-label, RLS, multi-campus, tahun ajaran entity, rapor PDF negara, SSO/OAuth, API publik.

## 10. Upgrade Path

- **B (self-service):** tambah `organizations.plan/trialEndsAt/seatLimit` + `GET /api/organizations/me/billing` + halaman billing read-only + cron trial.
- **C (full SaaS):** gateway + webhook + RLS + subdomain routing + onboarding wizard.

## 11. File Touch List (estimasi)

- `server/database/schema.sqlite.ts`, `server/database/schema.postgres.ts` (uniqueIndex)
- `drizzle-postgresql/*` (new migrations)
- `server/api/{students,subjects,schedules,exam-events,question-bank,question-packages,courses,quizzes}/**`
- `server/utils/tenant.ts`, `server/utils/db.ts`, `server/utils/billing.ts` (baru, 5 baris)
- `docker-compose.yml`, `scripts/backup-pg.sh`, `docs/POSTGRESQL.md`
- `app/pages/auth/register.vue`, `app/pages/index.vue` (Terms link)
- `server/database/seed.ts`, `scripts/db-reset.ts` (guard)
- `tests/tenant-isolation.test.ts` atau `scripts/test-tenant-isolation.ts`

---
*Spec ini adalah gate — implementasi mulai setelah user approve. Next: `writing-plans`.*
