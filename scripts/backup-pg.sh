#!/bin/sh
set -eu
: "${DATABASE_URL:?DATABASE_URL required}"
DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$DIR"
STAMP="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
OUT="$DIR/pg-$STAMP.dump"
pg_dump --format=custom --no-owner --dbname="$DATABASE_URL" --file="$OUT"
echo "Backup: $OUT"
ls -lh "$OUT"
if [ -d public/uploads ]; then tar -czf "$DIR/uploads-$STAMP.tar.gz" public/uploads; fi
