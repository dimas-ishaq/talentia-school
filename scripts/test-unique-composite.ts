// scripts/test-unique-composite.ts
// Memastikan constraint unik global (code/nama/nis/key) sudah jadi composite
// per organisasi, supaya 2 sekolah tidak saling menabrak saat buat data sama.
import assert from 'node:assert/strict'
import { getTableConfig as getSqliteTableConfig } from 'drizzle-orm/sqlite-core'
import { getTableConfig as getPgTableConfig } from 'drizzle-orm/pg-core'
import * as sqlite from '../server/database/schema.sqlite'
import * as pg from '../server/database/schema.postgres'

type IndexLike = { isUnique?: boolean; config: { name?: string; columns: { name: string }[] } }
type TableLike = Parameters<typeof getSqliteTableConfig>[0]

function uniqueIndexColumns(table: unknown, getConfig: (t: never) => { indexes: readonly IndexLike[] }, indexName: string): string[] {
  const cfgIndexes = getConfig(table as never).indexes as readonly IndexLike[]
  const found = cfgIndexes.find((i) => i.config?.name === indexName)
  assert.ok(found, `index ${indexName} tidak ditemukan`)
  const isUnique = (found as { isUnique?: boolean }).isUnique ?? true
  assert.equal(isUnique, true, `index ${indexName} harus UNIQUE`)
  return found!.config!.columns.map((c) => c.name)
}

function hasColumn(table: unknown, getConfig: (t: never) => { columns: readonly { name: string }[] }, columnName: string): boolean {
  return getConfig(table as never).columns.some((c) => c.name === columnName)
}

const CASES: { table: keyof typeof sqlite; indexName: string; expectedColumns: string[] }[] = [
  { table: 'subjects', indexName: 'subjects_org_code_idx', expectedColumns: ['organization_id', 'code'] },
  { table: 'subjects', indexName: 'subjects_org_name_idx', expectedColumns: ['organization_id', 'name'] },
  { table: 'courses', indexName: 'courses_org_name_idx', expectedColumns: ['organization_id', 'name'] },
  { table: 'categories', indexName: 'categories_org_name_idx', expectedColumns: ['organization_id', 'name'] },
  { table: 'teachers', indexName: 'teachers_org_code_idx', expectedColumns: ['organization_id', 'code'] },
  { table: 'teachers', indexName: 'teachers_org_nip_idx', expectedColumns: ['organization_id', 'nip'] },
  { table: 'students', indexName: 'students_org_nis_idx', expectedColumns: ['organization_id', 'nis'] },
  { table: 'settings', indexName: 'settings_org_key_idx', expectedColumns: ['organization_id', 'key'] },
]

// Kolom yang TIDAK boleh jadi unik global lagi.
const MUST_NOT_BE_COLUMN_UNIQUE: { table: keyof typeof sqlite; column: string }[] = [
  { table: 'subjects', column: 'code' },
  { table: 'subjects', column: 'name' },
  { table: 'courses', column: 'name' },
  { table: 'categories', column: 'name' },
  { table: 'teachers', column: 'code' },
  { table: 'teachers', column: 'nip' },
  { table: 'students', column: 'nis' },
]

// Yang tetap global (identitas, bukan data per-sekolah).
const MUST_STAY_GLOBALLY_UNIQUE: { table: keyof typeof sqlite; column: string }[] = [
  { table: 'users', column: 'email' },
  { table: 'organizations', column: 'slug' },
]

function columnIsUnique(table: unknown, getConfig: (t: never) => { columns: readonly Record<string, unknown>[] }, columnName: string): boolean {
  const cols = getConfig(table as never).columns as readonly Record<string, unknown>[]
  return !!cols.find((c) => c.name === columnName)?.notNull && !!cols.find((c) => c.name === columnName)?.isUnique
}

let failures = 0
function check(label: string, fn: () => void) {
  try {
    fn()
    console.log(`  OK   ${label}`)
  } catch (err) {
    failures++
    console.error(`  FAIL ${label}: ${(err as Error).message}`)
  }
}

for (const [dialect, mod, getConfig] of [
  ['sqlite', sqlite, getSqliteTableConfig],
  ['postgres', pg, getPgTableConfig],
] as const) {
  console.log(`\n[${dialect}]`)
  for (const c of CASES) {
    check(`${c.table}.${c.indexName} unique(${c.expectedColumns.join(',')})`, () => {
      const cols = uniqueIndexColumns(mod[c.table] as TableLike, getConfig as never, c.indexName)
      assert.deepEqual(cols, c.expectedColumns)
    })
  }
  for (const c of MUST_NOT_BE_COLUMN_UNIQUE) {
    check(`${c.table}.${c.column} bukan column-level unique`, () => {
      assert.equal(columnIsUnique(mod[c.table], getConfig as never, c.column), false)
    })
  }
  for (const c of MUST_STAY_GLOBALLY_UNIQUE) {
    check(`${c.table}.${c.column} tetap globally unique`, () => {
      assert.equal(columnIsUnique(mod[c.table], getConfig as never, c.column), true)
    })
  }
  check('settings.organizationId ada (wajib untuk composite key)', () => {
    assert.equal(hasColumn(mod.settings, getConfig as never, 'organization_id'), true)
  })
}

if (failures > 0) {
  console.error(`\n${failures} check gagal`)
  process.exit(1)
}
console.log('\nSemua check composite unique lulus')