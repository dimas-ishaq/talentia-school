#!/bin/sh
set -eu
: "${DATABASE_URL:?DATABASE_URL required (Postgres) — jalankan di host dengan pg_dump/pg_restore}"
./scripts/backup-pg.sh
FILE="$(ls -t backups/pg-*.dump | head -n 1)"
[ -f "$FILE" ] || { echo "dump tidak ditemukan"; exit 1; }
pg_restore --list "$FILE" | head -n 20
echo "PASS"
