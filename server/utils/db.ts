// server/utils/db.ts
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3'
import { drizzle as drizzlePostgres } from 'drizzle-orm/node-postgres'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import { Pool } from 'pg'
import * as schema from '../database/schema'

const databaseUrl = process.env.DATABASE_URL
const isPostgres = !!databaseUrl?.startsWith('postgres')

type AppDb = BetterSQLite3Database<typeof schema>

let sqlite: InstanceType<typeof Database> | null = null
let sqliteDb: AppDb | null = null

if (!isPostgres) {
// ponytail: blok SQLite ALTER di bawah ini hanya fallback dev.
// Source of truth Postgres adalah migrasi versioned di drizzle-postgresql/* (compose service `migrate`).
// Jangan tambah ALTER Postgres di sini; tambah file migrasi baru via drizzle-kit generate.
  sqlite = new Database(process.env.SQLITE_PATH || './server/database/local.db')
  const hasColumn = (table: string, column: string) => sqlite!.prepare(`PRAGMA table_info("${table}")`).all().some((row: any) => row.name === column)
  const hasTable = (table: string) => !!sqlite!.prepare(`SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?`).get(table)
  if (!hasTable('organizations')) {
    sqlite.exec(`CREATE TABLE organizations (id text PRIMARY KEY NOT NULL, name text NOT NULL, slug text NOT NULL UNIQUE, status text NOT NULL DEFAULT 'trial', created_at integer NOT NULL)`)
  }
  if (hasTable('activities') && !hasColumn('activities', 'forum_require_post')) sqlite.exec("ALTER TABLE activities ADD COLUMN forum_require_post integer NOT NULL DEFAULT 0")
  if (hasTable('activities') && !hasColumn('activities', 'forum_require_reply')) sqlite.exec("ALTER TABLE activities ADD COLUMN forum_require_reply integer NOT NULL DEFAULT 0")
  if (hasTable('activities') && !hasColumn('activities', 'forum_completion_rule')) sqlite.exec("ALTER TABLE activities ADD COLUMN forum_completion_rule text NOT NULL DEFAULT 'view'")
  if (hasTable('activities') && !hasColumn('activities', 'link_completion_rule')) sqlite.exec("ALTER TABLE activities ADD COLUMN link_completion_rule text NOT NULL DEFAULT 'view'")
  if (hasTable('activities') && !hasColumn('activities', 'link_open_in_new_tab')) sqlite.exec("ALTER TABLE activities ADD COLUMN link_open_in_new_tab integer NOT NULL DEFAULT 1")
  if (!hasTable('forum_discussions')) sqlite.exec(`CREATE TABLE forum_discussions (id text PRIMARY KEY NOT NULL, activity_id text NOT NULL REFERENCES activities(id) ON DELETE CASCADE, title text NOT NULL, question text NOT NULL, created_by text NOT NULL REFERENCES users(id) ON DELETE RESTRICT, created_at integer NOT NULL, updated_at integer NOT NULL)`)
  if (!hasTable('forum_posts')) sqlite.exec(`CREATE TABLE forum_posts (id text PRIMARY KEY NOT NULL, activity_id text NOT NULL REFERENCES activities(id) ON DELETE CASCADE, discussion_id text REFERENCES forum_discussions(id) ON DELETE CASCADE, user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE, student_id text REFERENCES students(id) ON DELETE CASCADE, parent_id text, content text NOT NULL, created_at integer NOT NULL, updated_at integer NOT NULL)`)
  if (hasTable('forum_posts') && !hasColumn('forum_posts', 'discussion_id')) sqlite.exec('ALTER TABLE forum_posts ADD COLUMN discussion_id text REFERENCES forum_discussions(id) ON DELETE CASCADE')
  if (hasTable('forum_posts') && hasColumn('forum_posts', 'discussion_id') && hasTable('forum_discussions')) sqlite.exec("UPDATE forum_posts SET discussion_id = (SELECT id FROM forum_discussions WHERE forum_discussions.activity_id = forum_posts.activity_id ORDER BY created_at LIMIT 1) WHERE discussion_id IS NULL")
  if (!hasColumn('users', 'organization_id')) sqlite.exec('ALTER TABLE users ADD COLUMN organization_id text REFERENCES organizations(id) ON DELETE SET NULL')
  if (!hasColumn('users', 'platform_role')) sqlite.exec('ALTER TABLE users ADD COLUMN platform_role text')
  if (!hasColumn('settings', 'organization_id')) sqlite.exec('ALTER TABLE settings ADD COLUMN organization_id text REFERENCES organizations(id) ON DELETE CASCADE')
  for (const table of ['teachers', 'parents', 'students', 'classes', 'subjects', 'announcements', 'attendance', 'calendar_events', 'schedule_entries', 'categories', 'courses', 'exam_events']) {
    if (hasTable(table) && !hasColumn(table, 'organization_id')) sqlite.exec(`ALTER TABLE "${table}" ADD COLUMN organization_id text REFERENCES organizations(id) ON DELETE CASCADE`)
  }
  if (hasTable('attendance') && !hasColumn('attendance', 'course_id')) sqlite.exec("ALTER TABLE attendance ADD COLUMN course_id text REFERENCES courses(id) ON DELETE CASCADE")
  if (hasTable('attendance') && !hasColumn('attendance', 'activity_note')) sqlite.exec('ALTER TABLE attendance ADD COLUMN activity_note text')
  if (hasTable('attendance') && !hasColumn('attendance', 'learning_note')) sqlite.exec('ALTER TABLE attendance ADD COLUMN learning_note text')
  if (hasTable('attendance')) sqlite.exec('CREATE UNIQUE INDEX IF NOT EXISTS attendance_student_course_date_idx ON attendance (student_id, course_id, date)')
  if (hasTable('activities') && !hasColumn('activities', 'presentation_source')) sqlite.exec("ALTER TABLE activities ADD COLUMN presentation_source text")
  if (hasTable('activities') && !hasColumn('activities', 'presentation_file_url')) sqlite.exec('ALTER TABLE activities ADD COLUMN presentation_file_url text')
  if (hasTable('activities') && !hasColumn('activities', 'presentation_original_url')) sqlite.exec('ALTER TABLE activities ADD COLUMN presentation_original_url text')
  if (hasTable('activities') && !hasColumn('activities', 'presentation_page_count')) sqlite.exec('ALTER TABLE activities ADD COLUMN presentation_page_count integer')
  if (!hasTable('organization_members')) {
    sqlite.exec(`CREATE TABLE organization_members (organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE, role text NOT NULL, status text NOT NULL DEFAULT 'active', PRIMARY KEY (organization_id, user_id))`)
  }
  if (!hasTable('organization_invites')) {
    sqlite.exec(`CREATE TABLE organization_invites (token_hash text PRIMARY KEY NOT NULL, organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, email text NOT NULL, role text NOT NULL, expires_at integer NOT NULL, accepted_at integer, created_at integer NOT NULL)`)
  }
  const defaultOrganization = sqlite.prepare('SELECT id FROM organizations ORDER BY created_at LIMIT 1').get() as { id: string } | undefined
  const defaultOrganizationId = defaultOrganization?.id || crypto.randomUUID()
  if (!defaultOrganization) sqlite.prepare("INSERT INTO organizations (id, name, slug, status, created_at) VALUES (?, ?, ?, 'trial', ?)").run(defaultOrganizationId, 'Sekolah Utama', `sekolah-utama-${defaultOrganizationId.slice(0, 8)}`, Date.now())
  sqlite.prepare('UPDATE users SET organization_id = ? WHERE organization_id IS NULL').run(defaultOrganizationId)
  for (const table of ['teachers', 'parents', 'students', 'classes', 'subjects', 'announcements', 'attendance', 'calendar_events', 'schedule_entries', 'categories', 'courses', 'exam_events', 'settings']) {
    if (hasTable(table) && hasColumn(table, 'organization_id')) sqlite.prepare(`UPDATE "${table}" SET organization_id = ? WHERE organization_id IS NULL`).run(defaultOrganizationId)
  }
  sqlite.prepare("INSERT OR IGNORE INTO organization_members (organization_id, user_id, role, status) SELECT ?, id, CASE WHEN role = 'admin' THEN 'org_admin' ELSE role END, 'active' FROM users").run(defaultOrganizationId)
  sqliteDb = drizzleSqlite(sqlite, { schema }) as unknown as AppDb
}

const pgPool = isPostgres ? new Pool({ connectionString: databaseUrl }) : null
const pgDb = isPostgres ? (drizzlePostgres(pgPool!, { schema }) as unknown as AppDb) : null

export const db: AppDb = (isPostgres ? pgDb! : sqliteDb!) as AppDb

export { schema }

export async function ensureOrganization(user: { id: string; organizationId?: string | null; role?: string }) {
  const existing = user.organizationId
    ? await db.query.organizations.findFirst({ where: (o: any, { eq }: any) => eq(o.id, user.organizationId!) })
    : await db.query.organizations.findFirst()
  const organizationId = user.organizationId || (existing as any)?.id || crypto.randomUUID()
  if (!existing) await db.insert(schema.organizations).values({ id: organizationId, name: 'Sekolah Utama', slug: `sekolah-utama-${organizationId.slice(0, 8)}` })
  const role = user.role === 'admin' ? 'org_admin' : (user.role === 'owner' || user.role === 'org_admin' || user.role === 'teacher' || user.role === 'student' || user.role === 'parent' ? user.role : 'owner')
  await db.insert(schema.organizationMembers).values({ organizationId, userId: user.id, role, status: 'active' }).onConflictDoNothing()
  return organizationId
}
