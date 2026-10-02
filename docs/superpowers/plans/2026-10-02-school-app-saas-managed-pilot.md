# School-App SaaS Managed Pilot — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden single-brand Talentia into managed pilot SaaS (per-siswa/bulan, manual invoice) — IDOR 0, Postgres migration versioned, backup/restore verified, demo hygiene, billing counted from `students.is_active`.

**Architecture:** Fix tenant filter on every `/api/*` query (`WHERE organization_id = :org` or join via parent), replace global uniques with composite `uniqueIndex(organizationId, key)`, generate `drizzle-postgresql` migrations, add compose `migrate` init, add `countBillableStudents()` util, add `pg_dump` backup + runbook, guard seed/reset, add Terms/Privacy stubs. No new subscription tables in pilot.

**Tech Stack:** Nuxt 4.5 / Nitro, Drizzle ORM 0.45 (sqlite + pg), Postgres 16, SQLite better-sqlite3, Node 22, Docker Compose, bcrypt, nuxt-auth-utils.

**Spec:** `docs/superpowers/specs/2026-10-02-school-app-saas-managed-pilot-design.md` (commit 67842be)

## Global Constraints

- Pricing = per siswa aktif/bulan = `COUNT(*) FROM students WHERE organization_id = :org AND is_active = true` (`students.isActive boolean default true` — `schema.sqlite.ts`); snapshot akhir bulan.
- No `plans/subscriptions/invoices/payments` tables in pilot; billing manual outside app; `organizations.status` changed manually (`trial`/`active` pass, `suspended`/`cancelled` blocked by `server/utils/tenant.ts:18`).
- Postgres prod via `drizzle-postgresql/*` migrations versioned; `server/utils/db.ts:19-60` ALTER runtime is dev-only fallback, not Postgres source of truth.
- Back-compat: `findCourseOrThrow(id, orgId?)` optional second arg; `requireAdmin` already delegates to `requireOrganizationAdmin` (`server/utils/requireAdmin.ts:3`) — don't break legacy `admin` role.
- IDOR responses must be `404` not `403` for cross-tenant `[id]` lookups (don't leak existence).
- Single replica pilot; rate-limit in-memory `Map` and `console.*` logs stay (no Redis/pino in pilot); `NUXT_PUBLIC_SHOW_DEMO_ACCOUNTS=false` in prod.
- Commits small, tests before code (TDD); every task ends with verifiable test + commit.

## Review Focus

1. **Cross-tenant ID enumeration** — attacker with valid session for org B fetches `/api/students/:id` of org A by guessing UUID → expect 404, not data; same for `courses/[id]`, `exam-events/[id]`, `question-bank/[id]`.
2. **List leak without filter** — `GET /api/exam-events`, `/api/question-bank`, `/api/courses/[id].get` sub-queries (`teachersList`, `sectionsRows`) leaking rows from other orgs when filter omitted.
3. **Unique collision DoS** — tenant A creates `subjects.code='MTK'`, tenant B same code should succeed (composite unique), not 500 unique violation.
4. **Stale/is_inactive students counted** — `is_active=false` students must not inflate `countBillableStudents`; `is_active` NULL/missing handling.
5. **Fresh Postgres deploy** — `docker compose down -v && up --build` without manual ALTER must create `organizations` + `organization_id` columns and allow register/login.

---

### Task 1: Composite Unique Constraints (Schema)

**Files:**
- Modify: `server/database/schema.sqlite.ts`
- Modify: `server/database/schema.postgres.ts`
- Modify: `server/database/schema.ts` (re-export, if needed to keep sqlite/postgres in sync)
- Create: `drizzle-postgresql/<generated>.sql` + `drizzle/<generated>.sql` (via `drizzle-kit generate`)
- Test: `scripts/test-unique-composite.ts` (throwaway probe, then removed or kept as doc)

**Interfaces:**
- Consumes: none
- Produces: `uniqueIndex('*_org_key_idx').on(table.organizationId, table.key)` definitions consumed by Task 4 migration and Task 7 collision test

- [ ] **Step 1: Write probe `scripts/test-unique-composite.ts` asserting current bug**

```ts
import assert from 'node:assert/strict'
// Two orgs, same subjects.code='MTK' and courses.name='Matematika' should both insert.
// Before fix: second insert throws SQLITE_CONSTRAINT_UNIQUE / PG unique_violation.
// After fix: both succeed.
// Also assert settings: same key 'upload.max_size_mb' in two orgs both succeed.
```

- [ ] **Step 2: Run probe to confirm failure**

Run: `node --loader tsx scripts/test-unique-composite.ts` (or `npx tsx scripts/test-unique-composite.ts`)
Expected: FAIL — second insert throws `unique constraint failed: subjects.code` (or `courses.name`)

- [ ] **Step 3: Implement composite uniques in both schema files**

Replace (exact):
- `subjects: code .unique()` + `name .unique()` → `uniqueIndex('subjects_org_code_idx').on(table.organizationId, table.code)` and `uniqueIndex('subjects_org_name_idx').on(table.organizationId, table.name)` — keep `code`/`name` columns `.notNull()` without `.unique()`
- `courses: name .unique()` → `uniqueIndex('courses_org_name_idx').on(table.organizationId, table.name)`
- `categories: name .unique()` → `uniqueIndex('categories_org_name_idx').on(table.organizationId, table.name)`
- `teachers: code .unique()`, `nip .unique()` → `uniqueIndex('teachers_org_code_idx').on(table.organizationId, table.code)` / `uniqueIndex('teachers_org_nip_idx').on(table.organizationId, table.nip)` — allow NULL `code`/`nip` duplicates (SQLite PG handles NULL != NULL; add `where` not needed pilot)
- `students: nis .unique()` → `uniqueIndex('students_org_nis_idx').on(table.organizationId, table.nis)`
- `settings: key` PK/text unique → change to composite: drop sole PK on `key`, add `uniqueIndex('settings_org_key_idx').on(table.organizationId, table.key)` and keep `key` as text + `organizationId` FK; if PK required, make PK `(organizationId, key)` via `primaryKey({ columns: [organizationId, key] })` per dialect
- `users.email .unique()` stays global (email is identity) — do NOT composite
- `organizations.slug .unique()` stays global

Must be identical change in `schema.sqlite.ts` and `schema.postgres.ts`.

- [ ] **Step 4: Generate migrations**

Run: `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/school_app npx drizzle-kit generate --config=drizzle.config.ts` and `npx drizzle-kit generate` (sqlite) — or single `npx drizzle-kit generate` twice switching `DATABASE_URL`. Verify `drizzle-postgresql/*` no longer `.gitkeep`, `drizzle/*` has new file, both journal entries added.
Expected: `drizzle-postgresql/*.sql` contains `CREATE UNIQUE INDEX ... ON ... (organization_id, code)` etc.

- [ ] **Step 5: Run probe again + typecheck**

Run: `npx tsx scripts/test-unique-composite.ts`
Expected: PASS
Run: `npm run typecheck` (or `npx tsc --noEmit`)
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add server/database/schema.sqlite.ts server/database/schema.postgres.ts drizzle* scripts/test-unique-composite.ts
git commit -m "fix(schema): composite unique per organization"
```

---

### Task 2: Tenant Filter — Direct `organizationId` Tables (Batch A)

**Files:**
- Modify: `server/api/students/[id].get.ts:30` — add `and(eq(students.id,id), eq(students.organizationId, organization.id))`
- Modify: `server/api/students/[id].patch.ts`, `server/api/students/[id].delete.ts` (same pattern)
- Modify: `server/api/subjects/[id].patch.ts`, `server/api/subjects/[id].delete.ts`, `server/api/subjects/index.get.ts` / `index.post.ts` (list filter)
- Modify: `server/api/classes/**`, `server/api/categories/**`, `server/api/announcements/**`, `server/api/calendar/**` (any `[id].*` and `index.get.ts`)
- Modify: `server/api/attendance/[id].patch.ts`, `attendance/[id].delete.ts`, `attendance/students.get.ts`, `attendance/summary.get.ts` (attendance has `organizationId`)
- Modify: `server/api/schedules/**` (`schedule_entries` has `organizationId`)
- Modify: `server/api/courses/index.get.ts` list filter, `server/api/courses/[id].get.ts:11,36` (verify `findCourseOrThrow(id, org.id)` + `db.select().from(courses).where(and(eq(courses.id,id), eq(courses.organizationId,org.id)))`)
- Test: `scripts/test-tenant-direct.ts` (2 orgs, cross-fetch)

**Interfaces:**
- Consumes: `requireOrganization(event) → { organization: { id } }` from `server/utils/tenant.ts:7`; composite uniques from Task 1
- Produces: tenant-filtered queries for direct tables; pattern reused by Task 3

- [ ] **Step 1: Write failing test `scripts/test-tenant-direct.ts`**

```ts
import assert from 'node:assert/strict'
// Setup: org A has student sA, org B has session for user in org B.
// Fetch GET /api/students/sA as org B → expect 404 (not 200).
// List GET /api/subjects?search= as org B → must not contain org A's subjects.
// GET /api/courses/courseA as org B → 404.
// One case per direct table type, at least students + subjects + courses + attendance.
```

- [ ] **Step 2: Run test to confirm leak**

Run: `npx tsx scripts/test-tenant-direct.ts`
Expected: FAIL — cross-tenant fetch returns 200 with data

- [ ] **Step 3: Implement filters**

For each file, replace `requireUserSession` or bare `requireAdmin` usage:
- If file already uses `requireAdmin` (which calls `requireOrganizationAdmin`), keep it but add `eq(table.organizationId, organization.id)` to every `where`, `findFirst`, `findMany`, `select().where()`.
- If file uses `requireUserSession` alone, change to `const { organization } = await requireOrganization(event)` (or `requireOrganizationAdmin` for admin-only routes) and add filter.
- List endpoints: `where: and(eq(table.organizationId, organization.id), ...existingFilters)` — if `filters` array exists, push `eq(table.organizationId, organization.id)` first.
- Detail endpoints: `where: and(eq(table.id, id), eq(table.organizationId, organization.id))` — throw 404 if null.
- Keep import `and` from `drizzle-orm` where needed.

Do NOT add new middleware in this task (Task 4).

- [ ] **Step 4: Run test to verify 404 + typecheck**

Run: `npx tsx scripts/test-tenant-direct.ts`
Expected: PASS (all cross-tenant 404, own-org 200)
Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/api/students server/api/subjects server/api/classes server/api/courses server/api/attendance server/api/schedules server/api/calendar server/api/categories server/api/announcements scripts/test-tenant-direct.ts
git commit -m "fix(tenant): filter direct organizationId tables"
```

---

### Task 3: Tenant Filter — Indirect Tables (Join via Parent)

**Files:**
- Modify: `server/api/courses/[id].get.ts:39-62` sub-queries (`teachersList`, `classesList`, `sectionsRows`, `studentSummary`, `courseScores`) — filter via parent `courses.organizationId` or `sections.courseId → courses`
- Modify: `server/api/courses/[id]/activities/**` (`sections` → `courses.organizationId`)
- Modify: `server/api/question-bank/index.get.ts:19`, `[id].patch.ts`, `[id].delete.ts`, `import.post.ts`, `index.post.ts` — filter via `courses`/`categories` or fallback to `createdBy` + org check; add `organizationId` check through course join
- Modify: `server/api/question-packages/**` similarly
- Modify: `server/api/exam-events/index.get.ts:16`, `server/api/exam-events/[id]/**` (`sesi*`, `subjects*`, `token*`) — `examEvents` HAS orgId (direct) but child tables `exam_event_subjects`, `exam_sessions` need join to `examEvents`
- Modify: `server/api/quizzes/**`, `server/api/courses/[id]/quizzes/**` (`quizAttempts`, `activityProgress`) via `activities → sections → courses`
- Modify: `server/api/student/exam-sessions*`, `server/api/student/exam-attempts/**` via `examSessions → examEvents`
- Modify: `server/api/dashboard/student-stats.get.ts`, `teacher-stats.get.ts` — add tenant filter (compare with `stats.get.ts:9` which is correct)
- Modify: `server/api/assignments/index.get.ts`, `server/api/uploads*.ts` if touching tenant-owned resources
- Test: `scripts/test-tenant-indirect.ts`

**Interfaces:**
- Consumes: tenant pattern from Task 2; `findCourseOrThrow(courseId, organizationId)` from `server/utils/courseAccess.ts:6`
- Produces: complete tenant isolation for child tables

- [ ] **Step 1: Write failing test `scripts/test-tenant-indirect.ts`**

```ts
import assert from 'node:assert/strict'
// Org A has courseA with quiz attempt; Org B fetches /api/courses/courseA/quizzes/... → 404.
// Org B GET /api/question-bank?scope=global → must not see Org A private questions.
// Org B GET /api/exam-events → must not see Org A's events.
// Org B GET /api/student/exam-sessions → isolated.
// Sections/activities leak via course get sub-queries.
```

- [ ] **Step 2: Run test to confirm indirect leak**

Run: `npx tsx scripts/test-tenant-indirect.ts`
Expected: FAIL — at least one cross-tenant list/detail leaks

- [ ] **Step 3: Implement joins/filters**

Pattern for child without `organizationId`:
```ts
const { organization } = await requireOrganization(event)
// 1) Verify parent course belongs to org first:
const course = await findCourseOrThrow(courseId, organization.id) // already tenant-aware
// 2) Then all child queries add and(eq(child.courseId, courseId), ...)
// or for deeper: innerJoin(sections, eq(activities.sectionId, sections.id))
//               innerJoin(courses, eq(sections.courseId, courses.id))
//               where(and(eq(courses.organizationId, organization.id), ...))
```
For `examEvents` children: `innerJoin(examEvents, eq(examSessions.eventId, examEvents.id)).where(eq(examEvents.organizationId, organization.id))`
For `questionBank` without orgId: filter by `courseId → courses.organizationId` or `createdBy` membership; if `questionBank.courseId` exists, join to `courses`.

Add `requireOrganization` to all 56 risky endpoints enumerated in plan (exclude `auth/*` and `health`).

- [ ] **Step 4: Run test + typecheck**

Run: `npx tsx scripts/test-tenant-indirect.ts`
Expected: PASS
Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/api/courses server/api/question-bank server/api/question-packages server/api/exam-events server/api/quizzes server/api/student server/api/dashboard scripts/test-tenant-indirect.ts server/utils/courseAccess.ts
git commit -m "fix(tenant): filter indirect tables via parent organization"
```

---

### Task 4: Production Migration Pipeline + Compose

**Files:**
- Modify: `drizzle.config.ts` (verify out/schema by `DATABASE_URL`)
- Modify: `docker-compose.yml` — add `migrate` service (or app entrypoint)
- Modify: `server/utils/db.ts` — keep SQLite ALTER fallback, but add comment `ponytail: Postgres uses drizzle migrations, not ALTER` and ensure no `ALTER` runs when `isPostgres`
- Create: `Dockerfile` entrypoint adjustment if using init approach (optional)
- Modify: `POSTGRESQL.md` + `docs/README.md` runbook
- Test: `docker compose down -v && docker compose up --build -d` manual verification + `scripts/verify-migration.ts`

**Interfaces:**
- Consumes: migrations from Task 1
- Produces: versioned DB on fresh and existing volumes

- [ ] **Step 1: Write verification script `scripts/verify-migration.ts`**

```ts
import assert from 'node:assert/strict'
import { db } from '../server/utils/db'
// Assert organizations table exists, students has organization_id, teachers has organization_id, etc.
// Assert composite unique indexes exist (query pg_indexes / sqlite_master).
```

- [ ] **Step 2: Run verification on current DB to show missing Postgres migration**

Run: `npx tsx scripts/verify-migration.ts`
Expected: FAIL on fresh Postgres (or PASS on SQLite with caveat)

- [ ] **Step 3: Implement compose migrate service**

In `docker-compose.yml` add:
```yaml
  migrate:
    build: .
    command: npx drizzle-kit migrate
    env_file: .env
    environment:
      DATABASE_URL: postgresql://postgres:${POSTGRES_PASSWORD:-postgres}@db:5432/school_app
    depends_on:
      db:
        condition: service_healthy
```
And make `app` depend on `migrate` (condition `service_completed_successfully`). Alternative: `app` entrypoint `sh -c "npx drizzle-kit migrate && node .output/server/index.mjs"` — pick one, document choice.

Ensure `server/utils/db.ts` early return for Postgres skips all `sqlite.exec(ALTER...)` blocks (already guarded by `if (!isPostgres)` — verify).

- [ ] **Step 4: Build + verify**

Run: `docker compose down -v; docker compose up --build -d; docker compose logs migrate --tail=50`
Expected: migrate exits 0, `organizations` created
Run: `npx tsx scripts/verify-migration.ts`
Expected: PASS
Run: `curl -s http://localhost:3000/api/health | jq` (or `fetch` in node)
Expected: `{"status":"ok"}` or equivalent

- [ ] **Step 5: Commit**

```bash
git add docker-compose.yml drizzle.config.ts server/utils/db.ts POSTGRESQL.md scripts/verify-migration.ts
git commit -m "chore(migrate): versioned Postgres migrations + compose init"
```

---

### Task 5: Billing Per-Siswa (`countBillableStudents`)

**Files:**
- Create: `server/utils/billing.ts`
- Modify: `server/api/organizations/me.get.ts` (optional: expose count read-only, if not exists create `server/api/organizations/billing.get.ts`)
- Test: `scripts/test-billing-count.ts`

**Interfaces:**
- Consumes: `students.isActive` + `students.organizationId`
- Produces: `countBillableStudents(organizationId: string) → Promise<number>` used by operator and future B billing page

- [ ] **Step 1: Write failing test `scripts/test-billing-count.ts`**

```ts
import assert from 'node:assert/strict'
import { countBillableStudents } from '../server/utils/billing'
// Setup: org A: 3 active + 1 inactive (isActive=false) + 1 in other org active
// Expect: countBillableStudents(orgA) === 3 (not 4, not 5)
// Edge: org with 0 students → 0
```

- [ ] **Step 2: Run test to confirm missing util**

Run: `npx tsx scripts/test-billing-count.ts`
Expected: FAIL — module not found / function not defined

- [ ] **Step 3: Implement `server/utils/billing.ts`**

```ts
import { eq, and, count } from 'drizzle-orm'
import { students } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

export async function countBillableStudents(organizationId: string): Promise<number> {
  const [row] = await db.select({ c: count() }).from(students).where(and(eq(students.organizationId, organizationId), eq(students.isActive, true)))
  return row?.c ?? 0
}
// ponytail: add proration (mid-month join/leave), pause, graduated tiers when >10 schools / self-service
```

Optional endpoint `GET /api/organizations/billing.get.ts` → `{ organizationId, billableStudents: number, period: string }` guarded by `requireOrganization`.

- [ ] **Step 4: Run test + typecheck**

Run: `npx tsx scripts/test-billing-count.ts`
Expected: PASS
Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/utils/billing.ts server/api/organizations/billing.get.ts scripts/test-billing-count.ts
git commit -m "feat(billing): countBillableStudents per org (is_active)"
```

---

### Task 6: Backup Postgres + Restore Runbook

**Files:**
- Create: `scripts/backup-pg.sh` (executable)
- Modify: `scripts/backup-verify.ts` — add Postgres branch (`pg_restore --list`)
- Modify: `docker-compose.yml` — add `backups` volume mount to `app` + optional `backup` sidecar cron
- Modify: `.env.example` — add `BACKUP_DIR`, `DATABASE_URL` comment for pg_dump
- Modify: `POSTGRESQL.md` — restore steps
- Test: `scripts/test-backup-pg.sh` (runs `pg_dump --format=custom` then `pg_restore --list`)

**Interfaces:**
- Consumes: `DATABASE_URL` (Postgres), `BACKUP_DIR`
- Produces: `backups/pg-*.dump` + verified restore

- [ ] **Step 1: Write test `scripts/test-backup-pg.sh`**

```bash
#!/bin/sh
set -e
./scripts/backup-pg.sh
ls backups/pg-*.dump
pg_restore --list backups/pg-*.dump | head -20
echo "PASS"
```

- [ ] **Step 2: Run test to confirm missing script**

Run: `sh scripts/test-backup-pg.sh`
Expected: FAIL — `backup-pg.sh: not found`

- [ ] **Step 3: Implement `scripts/backup-pg.sh`**

```sh
#!/bin/sh
set -e
: "${DATABASE_URL:?DATABASE_URL required}"
DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$DIR"
STAMP="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
OUT="$DIR/pg-$STAMP.dump"
pg_dump --format=custom --no-owner --dbname="$DATABASE_URL" --file="$OUT"
echo "Backup: $OUT"
ls -lh "$OUT"
# Optional: tar uploads
if [ -d "public/uploads" ]; then tar -czf "$DIR/uploads-$STAMP.tar.gz" public/uploads; fi
```

Add `backups` volume in compose: `volumes: - backups:/app/backups` + top-level `backups:`.

Extend `scripts/backup-verify.ts` to detect `.dump` files and run `pg_restore --list` (or `pg_isready` check).

- [ ] **Step 4: Run backup + verify**

Run: `sh scripts/backup-pg.sh && node --loader tsx scripts/backup-verify.ts` (or `npx tsx scripts/backup-verify.ts`)
Expected: PASS — dump created, verify lists tables
Run: `cat POSTGRESQL.md | grep -q pg_restore`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/backup-pg.sh scripts/backup-verify.ts docker-compose.yml .env.example POSTGRESQL.md scripts/test-backup-pg.sh
git commit -m "chore(ops): pg_dump backup + restore runbook"
```

---

### Task 7: Legal Stubs + Demo Hygiene + Final Isolation Gate

**Files:**
- Create: `app/pages/terms.vue` (stub), `app/pages/privacy.vue` (stub)
- Modify: `app/pages/auth/register.vue` — `href="#"` → `href="/terms"` + `href="/privacy"`
- Modify: `app/pages/index.vue` footer — `href="#"` → real `/terms`, `/privacy`, contact `mailto:`
- Modify: `server/database/seed.ts:37` — ensure production guard stays, optionally randomize demo password when `ALLOW_DEMO_SEED=true`
- Modify: `scripts/db-reset.ts` — add Postgres abort guard: `if (process.env.DATABASE_URL?.startsWith('postgres')) throw new Error('db:reset blocked on Postgres')`
- Create: `scripts/test-tenant-isolation-final.ts` — combined gate (runs Tasks 2+3+ billing assertions)
- Test: `npm run typecheck` + final gate

**Interfaces:**
- Consumes: all prior tasks
- Produces: shippable pilot

- [ ] **Step 1: Write final gate `scripts/test-tenant-isolation-final.ts`**

```ts
import assert from 'node:assert/strict'
// 1) Direct isolation: cross-org 404
// 2) Indirect isolation: question-bank/exam-events hidden
// 3) Composite unique: two orgs same code both succeed
// 4) Billing: inactive not counted
// 5) /terms and /privacy routes return 200 (Nuxt page exists)
```

- [ ] **Step 2: Run gate to show failures before fix**

Run: `npx tsx scripts/test-tenant-isolation-final.ts`
Expected: FAIL (if not yet fixed) or PASS (if prior tasks done) — record

- [ ] **Step 3: Implement stubs + guards**

`app/pages/terms.vue` / `privacy.vue` — minimal content:
```vue
<template><div class="prose mx-auto p-8"><h1>Terms</h1><p>Hubungi operator untuk perjanjian layanan per-siswa/bulan. Snapshot akhir bulan. Retensi ...</p></div></template>
```
`register.vue`: replace `<a href="#">Syarat dan Ketentuan</a>` with `<NuxtLink to="/terms">` and add privacy link.
`db-reset.ts`: add at top `if (process.env.DATABASE_URL?.startsWith('postgres')) { console.error('Blocked'); process.exit(1) }`

- [ ] **Step 4: Run gate + typecheck + build smoke**

Run: `npx tsx scripts/test-tenant-isolation-final.ts`
Expected: PASS
Run: `npm run typecheck && npm run build` (or `npx nuxt build --help` smoke)
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/pages/terms.vue app/pages/privacy.vue app/pages/auth/register.vue app/pages/index.vue server/database/seed.ts scripts/db-reset.ts scripts/test-tenant-isolation-final.ts
git commit -m "chore(legal): terms/privacy stubs + demo hygiene + final isolation gate"
```

---

## Self-Review

- Spec coverage: tenant isolation (§4.1) → T2+T3; composite unique → T1; migration → T4; provision manual → docs in T4; billing per-siswa → T5; ops backup → T6; legal/demo → T7. All P0/P1 covered, no scope creep to B/C.
- Step scan: each step single action, assertions verbatim, commands checkable.
- Type consistency: `countBillableStudents(orgId: string): Promise<number>`, `requireOrganization(event) → { organization:{id} }`, `findCourseOrThrow(id, orgId?)` preserved.
- Proportion: 7 tasks, each 5 steps, code signatures not bodies — plan shorter than code.
