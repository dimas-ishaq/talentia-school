# Talentia — School App

Platform manajemen sekolah modern untuk guru, siswa, dan orang tua.

## Memulai

```sh
npm install
cp .env.example .env   # lalu isi nilai-nilai yang dibutuhkan
npm run dev
```

Skrip lain: `npm run build`, `npm run typecheck`, `npm run db:push`, `npm run db:seed`, `npm run db:studio`.

## Struktur

- `app/` — halaman, komponen, composables (Nuxt client)
- `server/` — API routes, utilitas, middleware (Nitro)
- `shared/` — tipe & utilitas yang dipakai bersama client/server
- `drizzle/` — skema & migrasi database
- `scripts/` — skrip operasional (backup, migrasi, reset)
- `utils/`, `public/` — aset & helper
- `docs/` — catatan fitur, implementasi, dan checklist

## Dokumentasi

Lihat folder [`docs/`](./docs) untuk dokumentasi fitur dan catatan teknis.
PostgreSQL: lihat [`POSTGRESQL.md`](./POSTGRESQL.md).