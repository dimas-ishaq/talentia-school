# Integrasi PostgreSQL

Aplikasi mendukung dua mode database melalui `DATABASE_URL`:

- `DATABASE_URL` kosong: SQLite (`SQLITE_PATH` atau `./server/database/local.db`)
- `DATABASE_URL=postgresql://...` atau `postgres://...`: PostgreSQL

## PostgreSQL lokal

```bash
createdb school_app
$env:DATABASE_URL='postgresql://postgres:password@localhost:5432/school_app'
npm run db:push
npm run db:seed
npm run dev
```

Untuk Linux/macOS:

```bash
DATABASE_URL='postgresql://postgres:password@localhost:5432/school_app' npm run db:push
DATABASE_URL='postgresql://postgres:password@localhost:5432/school_app' npm run db:seed
```

`drizzle-kit` otomatis memakai schema PostgreSQL `server/database/schema.postgres.ts`, dialect PostgreSQL, serta folder migrasi `drizzle-postgresql/` ketika `DATABASE_URL` aktif.

Catatan: script migrasi legacy di `scripts/` masih SQLite-specific. Gunakan `npm run db:push` untuk schema PostgreSQL baru; migrasi data SQLite lama belum otomatis.
