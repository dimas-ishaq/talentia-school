// scripts/test-tenant-isolation.ts
// Gate isolasi tenant: boot app nyata (SQLite test DB) dengan 2 sekolah,
// lalu buktikan sekolah A tidak bisa baca data sekolah B lewat HTTP.
//
// Run: node --import tsx scripts/test-tenant-isolation.ts
import assert from 'node:assert/strict'
import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import { existsSync, mkdirSync, openSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import bcrypt from 'bcrypt'

const WORKSPACE = resolve('.superpowers/sdd/2026-10-02-school-app-saas-managed-pilot')
const DB_PATH = resolve(WORKSPACE, 'test-isolation.db')
const PORT = 3931
const BASE = `http://localhost:${PORT}`

function log(msg: string) { console.log(msg) }

async function waitForServer(server: ChildProcess, timeoutMs = 240_000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (server.exitCode !== null) throw new Error(`server berhenti sebelum siap (kode ${server.exitCode})`)
    try {
      const res = await fetch(`${BASE}/api/health`)
      if (res.ok) return
    } catch {}
    await new Promise((r) => setTimeout(r, 1000))
  }
  throw new Error('server tidak start dalam batas waktu')
}

async function login(email: string, password: string): Promise<string> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  assert.equal(res.status, 200, `login ${email} gagal: ${res.status} ${await res.text()}`)
  const cookie = res.headers.get('set-cookie')
  assert.ok(cookie, 'login harus mengembalikan session cookie')
  return cookie.split(';')[0]!
}

async function api(cookie: string, path: string) {
  const res = await fetch(`${BASE}${path}`, { headers: { cookie } })
  let body: any = null
  try { body = await res.json() } catch {}
  return { status: res.status, body }
}

async function post(path: string, body: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  let data: any = null
  try { data = await res.json() } catch {}
  return { status: res.status, body: data }
}

const PASSWORD = 'RahasiaKuat123!'

async function main() {
  mkdirSync(WORKSPACE, { recursive: true })
  rmSync(DB_PATH, { force: true })

  log('→ push schema ke DB test')
  const push = spawnSync('node', ['node_modules/drizzle-kit/bin.cjs', 'push', '--force'], {
    env: { ...process.env, SQLITE_PATH: DB_PATH, DATABASE_URL: '' },
    encoding: 'utf8',
  })
  if (push.status !== 0) throw new Error(`drizzle push gagal: ${push.stdout}\n${push.stderr}`)
  if (!existsSync(DB_PATH)) throw new Error('DB test tidak terbentuk')

  log('→ seed 2 sekolah')
  const password = await bcrypt.hash(PASSWORD, 10)
  const Database = (await import('better-sqlite3')).default
  const raw = new Database(DB_PATH)
  const insOrg = raw.prepare('INSERT INTO organizations (id, name, slug, status, created_at) VALUES (?, ?, ?, ?, ?)')
  insOrg.run('org_a', 'Sekolah A', 'sekolah-a', 'active', 1)
  insOrg.run('org_b', 'Sekolah B', 'sekolah-b', 'active', 2)
  const insUser = raw.prepare(
    'INSERT INTO users (id, organization_id, email, name, role, password, must_change_password, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?)',
  )
  insUser.run('u_a', 'org_a', 'admin.a@sekolah.test', 'Admin A', 'admin', password, 1)
  insUser.run('u_b', 'org_b', 'admin.b@sekolah.test', 'Admin B', 'admin', password, 1)
  const insMember = raw.prepare(
    'INSERT INTO organization_members (organization_id, user_id, role, status) VALUES (?, ?, ?, ?)',
  )
  insMember.run('org_a', 'u_a', 'org_admin', 'active')
  insMember.run('org_b', 'u_b', 'org_admin', 'active')
  insUser.run('u_siswa_a', 'org_a', 'siswa.a@sekolah.test', 'Siswa A', 'student', password, 1)
  insUser.run('u_siswa_b', 'org_b', 'siswa.b@sekolah.test', 'Siswa B', 'student', password, 1)
  insUser.run('u_teacher_a', 'org_a', 'guru.a@sekolah.test', 'Guru A', 'teacher', password, 1)
  insUser.run('u_teacher_b', 'org_b', 'guru.b@sekolah.test', 'Guru B', 'teacher', password, 1)
  const insTeacher = raw.prepare(
    'INSERT INTO teachers (id, organization_id, user_id, nip, is_active, created_at) VALUES (?, ?, ?, ?, 1, ?)',
  )
  insTeacher.run('teacher_a', 'org_a', 'u_teacher_a', 'NIP-A', 1)
  insTeacher.run('teacher_b', 'org_b', 'u_teacher_b', 'NIP-B', 2)
  const insStudent = raw.prepare(
    'INSERT INTO students (id, organization_id, user_id, nis, gender, is_active, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)',
  )
  const insClass = raw.prepare(
    'INSERT INTO classes (id, organization_id, name, level, is_active, created_at) VALUES (?, ?, ?, ?, 1, ?)',
  )
  insClass.run('class_a', 'org_a', 'X-A', 10, 1)
  insClass.run('class_b', 'org_b', 'X-B', 10, 2)
  insStudent.run('siswa_a', 'org_a', 'u_siswa_a', 'NIS-A-1', 'L', 1)
  insStudent.run('siswa_b', 'org_b', 'u_siswa_b', 'NIS-B-1', 'P', 1)
  raw.prepare('UPDATE students SET class_id = ? WHERE id = ?').run('class_a', 'siswa_a')
  raw.prepare('UPDATE students SET class_id = ? WHERE id = ?').run('class_b', 'siswa_b')
  const insSubject = raw.prepare(
    'INSERT INTO subjects (id, organization_id, code, name, is_active, created_at) VALUES (?, ?, ?, ?, 1, ?)',
  )
  insSubject.run('mapel_a', 'org_a', 'MTK', 'Matematika', 1)
  insSubject.run('mapel_b', 'org_b', 'MTK', 'Matematika', 1)
  insSubject.run('mapel_b2', 'org_b', 'IPA', 'Ilmu Pengetahuan Alam', 1)
  const insCourse = raw.prepare(
    'INSERT INTO courses (id, organization_id, name, code, is_active, is_system, position, created_by, created_at) VALUES (?, ?, ?, ?, 1, 0, 0, ?, ?)',
  )
  insCourse.run('course_a', 'org_a', 'Matematika', 'MTK', 'u_a', 1)
  insCourse.run('course_b', 'org_b', 'Matematika', 'MTK', 'u_b', 2)
  const insEvent = raw.prepare(
    'INSERT INTO exam_events (id, organization_id, name, type, academic_year, semester, start_date, end_date, status, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  )
  insEvent.run('ev_a', 'org_a', 'UTS A', 'ASTS', '2026/2027', 'ganjil', '2026-10-01', '2026-10-05', 'published', 'u_a', 1)
  insEvent.run('ev_b', 'org_b', 'UTS B', 'ASTS', '2026/2027', 'ganjil', '2026-10-01', '2026-10-05', 'published', 'u_b', 2)
  const insQuestion = raw.prepare(
    'INSERT INTO question_bank (id, scope, question, type, default_points, is_active, created_by, created_at) VALUES (?, ?, ?, ?, 1, 1, ?, ?)',
  )
  insQuestion.run('q_a', 'global', 'Soal rahasia sekolah A', 'multiple_choice', 'u_a', 1)
  insQuestion.run('q_b', 'global', 'Soal rahasia sekolah B', 'multiple_choice', 'u_b', 2)
  insUser.run('u_ia', 'org_a', 'nonaktif.a@sekolah.test', 'Siswa Nonaktif A', 'student', password, 1)
  raw.prepare(
    'INSERT INTO students (id, organization_id, user_id, nis, gender, is_active, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)',
  ).run('siswa_ia', 'org_a', 'u_ia', 'NIS-A-9', 'L', 1)
  const today = new Date()
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  const plus5 = new Date(today.getTime() + 5 * 864e5)
  const insCal = raw.prepare(
    'INSERT INTO calendar_events (id, organization_id, title, start_date, end_date, visibility, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
  )
  insCal.run('cal_a', 'org_a', 'Agenda A', iso(today), iso(plus5), 'public', 'u_a', 1, 1)
  insCal.run('cal_b', 'org_b', 'Agenda B', iso(today), iso(plus5), 'public', 'u_b', 2, 2)
  const insAtt = raw.prepare(
    'INSERT INTO attendance (id, organization_id, student_id, class_id, date, status, recorded_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  )
  insAtt.run('att_a', 'org_a', 'siswa_a', 'class_a', iso(today), 'present', 'u_a', 1)
  insAtt.run('att_b', 'org_b', 'siswa_b', 'class_b', iso(today), 'present', 'u_b', 2)
  raw.close()

  log('→ boot app')
  const bootLog = resolve(WORKSPACE, 'test-isolation-server.log')
  const logFd = openSync(bootLog, 'w')
  const server: ChildProcess = spawn('node', ['node_modules/@nuxt/cli/bin/nuxi.mjs', 'dev', '--port', String(PORT)], {
    env: {
      ...process.env,
      SQLITE_PATH: DB_PATH,
      DATABASE_URL: '',
      NUXT_SESSION_PASSWORD: 'a'.repeat(48),
      NUXT_PUBLIC_SHOW_DEMO_ACCOUNTS: 'false',
      NODE_ENV: 'development',
    },
    stdio: ['ignore', logFd, logFd],
  })
  let shuttingDown = false
  server.on('exit', (code) => {
    if (!shuttingDown && code !== 0 && code !== null) console.error(`server keluar dini dengan kode ${code} (lihat ${bootLog})`)
  })

  const results: string[] = []
  let failures = 0
  async function check(label: string, fn: () => Promise<void>) {
    try {
      await fn()
      results.push(`  OK   ${label}`)
      console.log(`  OK   ${label}`)
    } catch (err) {
      failures++
      results.push(`  FAIL ${label}: ${(err as Error).message}`)
      console.error(`  FAIL ${label}: ${(err as Error).message}`)
    }
  }

  try {
    await waitForServer(server)
    const cookieA = await login('admin.a@sekolah.test', PASSWORD)
    const cookieB = await login('admin.b@sekolah.test', PASSWORD)

    await check('GET /api/students/siswa_b sebagai admin A → 404', async () => {
      const res = await api(cookieA, '/api/students/siswa_b')
      assert.equal(res.status, 404, `harusnya 404, dapat ${res.status} ${JSON.stringify(res.body)}`)
    })
    await check('GET /api/students/siswa_a sebagai admin A → 200', async () => {
      const res = await api(cookieA, '/api/students/siswa_a')
      assert.equal(res.status, 200, `harusnya 200, dapat ${res.status}`)
      assert.equal(res.body?.data?.id, 'siswa_a')
    })
    await check('GET /api/students/siswa_a sebagai admin B → 404', async () => {
      const res = await api(cookieB, '/api/students/siswa_a')
      assert.equal(res.status, 404, `harusnya 404, dapat ${res.status}`)
    })
    await check('GET /api/students hanya memuat siswa organisasi sendiri', async () => {
      const res = await api(cookieA, '/api/students?perPage=100')
      assert.equal(res.status, 200)
      const ids = (res.body?.data ?? []).map((r: any) => r.id)
      assert.deepEqual(ids.sort(), ['siswa_a', 'siswa_ia'], `harus cuma siswa org_a, dapat ${JSON.stringify(ids)}`)
    })
    await check('GET /api/courses/course_b sebagai admin A → 404', async () => {
      const res = await api(cookieA, '/api/courses/course_b')
      assert.equal(res.status, 404, `harusnya 404, dapat ${res.status} ${JSON.stringify(res.body)?.slice(0, 120)}`)
    })
    await check('GET /api/courses/course_a sebagai admin A → 200', async () => {
      const res = await api(cookieA, '/api/courses/course_a')
      assert.equal(res.status, 200, `harusnya 200, dapat ${res.status}`)
    })
    await check('GET /api/subjects hanya memuat mapel organisasi sendiri', async () => {
      const res = await api(cookieA, '/api/subjects?perPage=100')
      assert.equal(res.status, 200, `status ${res.status}`)
      const codes = (res.body?.data ?? []).map((r: any) => r.code).sort()
      assert.deepEqual(codes, ['MTK'], `harus cuma MTK org A, dapat ${JSON.stringify(codes)}`)
    })
    await check('GET /api/exam-events hanya memuat event organisasi sendiri', async () => {
      const res = await api(cookieA, '/api/exam-events')
      assert.equal(res.status, 200, `status ${res.status}`)
      const ids = (res.body?.data ?? []).map((r: any) => r.id)
      assert.deepEqual(ids, ['ev_a'], `harus cuma ev_a, dapat ${JSON.stringify(ids)}`)
    })
    await check('GET /api/question-bank hanya memuat soal organisasi sendiri', async () => {
      const res = await api(cookieA, '/api/question-bank')
      assert.equal(res.status, 200, `status ${res.status}`)
      const qs = (res.body?.data ?? []).map((r: any) => r.question)
      assert.deepEqual(qs, ['Soal rahasia sekolah A'], `dapat ${JSON.stringify(qs)}`)
    })
    await check('GET /api/exam-events/ev_b sebagai admin A → 404', async () => {
      const res = await api(cookieA, '/api/exam-events/ev_b')
      assert.equal(res.status, 404, `harusnya 404, dapat ${res.status} ${JSON.stringify(res.body)}`)
    })
    await check('GET /api/exam-events/ev_a sebagai admin A → 200', async () => {
      const res = await api(cookieA, '/api/exam-events/ev_a')
      assert.equal(res.status, 200, `harusnya 200, dapat ${res.status}`)
    })
    await check('GET /api/calendar hanya memuat agenda/kalender org sendiri', async () => {
      const res = await api(cookieA, '/api/calendar')
      assert.equal(res.status, 200, `status ${res.status}`)
      const titles: string[] = (res.body?.data ?? []).map((r: any) => r.title)
      assert.equal(titles.includes('Agenda A'), true, `harus ada Agenda A, dapat ${JSON.stringify(titles)}`)
      assert.equal(titles.includes('Agenda B'), false, `tidak boleh ada Agenda B, dapat ${JSON.stringify(titles)}`)
    })
    await check('GET /api/calendar/upcoming hanya memuat upcoming org sendiri', async () => {
      const res = await api(cookieA, '/api/calendar/upcoming')
      assert.equal(res.status, 200, `status ${res.status}`)
      const titles: string[] = (res.body?.data ?? []).map((r: any) => r.title ?? r.name ?? '')
      // custom + exam are combined in upcoming; only org_a visible
      assert.equal(titles.includes('Agenda B'), false, `tidak boleh ada Agenda B, dapat ${JSON.stringify(titles)}`)
    })
    await check('GET /api/attendance/students hanya memuat siswa org sendiri', async () => {
      const res = await api(cookieA, '/api/attendance/students?perPage=100')
      assert.equal(res.status, 200, `status ${res.status}`)
      const names: string[] = (res.body?.data ?? []).map((r: any) => r.name ?? r.nis ?? '')
      assert.equal(names.includes('Siswa A'), true, `harus ada Siswa A, dapat ${JSON.stringify(res.body?.data)}`)
      assert.equal(names.includes('Siswa B'), false, `tidak boleh ada Siswa B`)
    })
    await check('GET /api/attendance/summary hanya menghitung organisasi sendiri', async () => {
      const today = new Date().toISOString().slice(0, 10)
      const res = await api(cookieA, `/api/attendance/summary?from=${today}&to=${today}`)
      assert.equal(res.status, 200, `status ${res.status}`)
      const ids: string[] = (res.body?.data ?? []).map((r: any) => r.studentId ?? r.id ?? '')
      assert.equal(ids.includes('siswa_b'), false, `tidak boleh ada siswa_b di summary org_a`)
    })
    await check('POST /api/auth/register membuat org suspended (tak bisa dipakai tanpa persetujuan)', async () => {
      const email = `baru.${Date.now()}@sekolah.test`
      const res = await post('/api/auth/register', {
        organizationName: 'Sekolah Baru',
        username: 'admin_baru',
        email,
        password: PASSWORD,
        confirmPassword: PASSWORD,
      })
      assert.equal(res.status, 201, `register harus 201, dapat ${res.status} ${JSON.stringify(res.body)}`)
      const verifyDb = new Database(DB_PATH, { readonly: true })
      const org = verifyDb.prepare('SELECT status FROM organizations WHERE id = (SELECT organization_id FROM users WHERE email = ?)').get(email) as { status?: string } | undefined
      verifyDb.close()
      assert.ok(org, 'organisasi baru harus ada')
      assert.equal(org.status, 'suspended', `status org baru harus suspended, dapat ${org.status}`)
      // Akun suspended tidak boleh login/akses tenant
      const badLogin = await post('/api/auth/login', { email, password: PASSWORD })
      assert.equal(badLogin.status, 403, `login akun suspended harus 403, dapat ${badLogin.status} ${JSON.stringify(badLogin.body)}`)
    })
    await check('GET /api/teachers/teacher_b sebagai admin A → 404 (IDOR guru)', async () => {
      const res = await api(cookieA, '/api/teachers/teacher_b')
      assert.equal(res.status, 404, `cross-tenant read harus 404, dapat ${res.status} ${JSON.stringify(res.body)}`)
    })
    await check('PATCH /api/teachers/teacher_b sebagai admin A → 404', async () => {
      const res = await fetch(`${BASE}/api/teachers/teacher_b`, {
        method: 'PATCH', headers: { 'content-type': 'application/json', cookie: cookieA },
        body: JSON.stringify({ name: 'Hacked', nip: 'NIP-B' }),
      })
      assert.equal(res.status, 404, `cross-tenant patch harus 404, dapat ${res.status} ${await res.text()}`)
    })
    await check('GET /api/organizations/billing menghitung per org is_active', async () => {
      const res = await api(cookieA, '/api/organizations/billing')
      assert.equal(res.status, 200, `status ${res.status} ${JSON.stringify(res.body)}`)
      // org_a: siswa_a aktif (1), siswa_ia nonaktif (0) → 1; siswa_b ada di org_b, tidak dihitung
      assert.equal(res.body?.data?.billableStudents, 1, `org_a harus 1 (is_active), dapat ${JSON.stringify(res.body?.data)}`)
      const resB = await api(cookieB, '/api/organizations/billing')
      assert.equal(resB.body?.data?.billableStudents, 1, `org_b harus 1, dapat ${JSON.stringify(resB.body?.data)}`)
    })
  } finally {
    shuttingDown = true
    if (server.pid) {
      if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' })
      else server.kill('SIGTERM')
    }
  }

  console.log('')
  if (failures > 0) {
    console.error(`${failures} check isolasi tenant gagal`)
    process.exit(1)
  }
  console.log(`Semua ${results.length} check isolasi tenant lulus`)
}

main().catch((err) => {
  console.error('test gagal:', err)
  process.exit(1)
})