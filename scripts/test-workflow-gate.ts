// Gate alur kerja: memastikan tidak ada role valid yang terjebak 404/halaman kosong,
// siswa bisa buka absensi & nilai, dan onboarding profil punya form.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = (file: string) => readFileSync(join(root, file), 'utf8')

// 1) Halaman admin wajib menerima org_admin + owner (bukan hanya "admin")
const adminPages = [
  'app/pages/dashboard/(master-data)/students/index.vue',
  'app/pages/dashboard/(master-data)/students/create.vue',
  'app/pages/dashboard/(master-data)/students/[id]/edit.vue',
  'app/pages/dashboard/(master-data)/teachers/index.vue',
  'app/pages/dashboard/(master-data)/teachers/create.vue',
  'app/pages/dashboard/(master-data)/teachers/[id]/edit.vue',
  'app/pages/dashboard/(master-data)/classes/index.vue',
  'app/pages/dashboard/(master-data)/subjects/index.vue',
  'app/pages/dashboard/(system)/settings/index.vue',
  'app/pages/dashboard/(academic)/schedule/index.vue',
]
for (const file of adminPages) {
  const source = read(file)
  assert.match(source, /roles:\s*\[([^\]]*)\]/, `${file} tidak punya meta roles`)
  const roles = source.match(/roles:\s*\[([^\]]*)\]/)![1] ?? ''
  for (const role of ['org_admin', 'owner']) {
    assert.ok(roles.includes(role), `${file} tidak mengizinkan ${role}`)
  }
}

// 2) Halaman yang me-render komponen admin harus pakai isAdmin, bukan role === 'admin'
const adminRenderPages = [
  'app/pages/dashboard/(master-data)/students/index.vue',
  'app/pages/dashboard/(master-data)/classes/index.vue',
  'app/pages/dashboard/(master-data)/subjects/index.vue',
  'app/pages/dashboard/(academic)/schedule/index.vue',
  'app/pages/dashboard/(academic)/attendance/index.vue',
  'app/pages/dashboard/(academic)/grades/index.vue',
]
for (const file of adminRenderPages) {
  const source = read(file)
  assert.ok(
    source.includes('isAdmin'),
    `${file} masih pakai cek role manual, harus pakai isAdmin dari useAuth`,
  )
}

// 3) Absensi: siswa tidak dialihkan, StudentAttendanceView benar-benar dirender
const attendance = read('app/pages/dashboard/(academic)/attendance/index.vue')
assert.ok(!attendance.includes("navigateTo('/dashboard/courses')"), 'halaman absensi masih mengalihkan siswa')
assert.ok(attendance.includes('StudentAttendanceView'), 'StudentAttendanceView tidak dirender di halaman absensi')

// 4) Nilai siswa tidak boleh diarahkan ke route khusus teacher
const grades = read('app/pages/dashboard/(academic)/grades/index.vue')
assert.ok(!grades.includes('/progress'), 'kartu nilai siswa masih mengarah ke /progress (khusus teacher)')

// 5) Onboarding: halaman profil punya form + endpoint, banner memberi tautan
const profile = read('app/pages/dashboard/(system)/profile.vue')
assert.ok(!profile.includes('belum tersedia'), 'halaman profil masih stub')
assert.ok(read('server/api/auth/profile.patch.ts').includes('isProfileComplete'), 'endpoint profil belum tersedia')
assert.ok(profile.includes("'PATCH'") || profile.includes("method: 'PATCH'"), 'halaman profil tidak menyimpan perubahan')
const banner = read('app/components/ProfileIncompleteBanner.vue')
assert.ok(banner.includes('/dashboard/profile'), 'banner profil tidak mengarahkan ke form profil')

// 6) Dashboard tidak boleh menampilkan data hardcode
for (const file of [
  'app/components/dashboard/TeacherDashboard.vue',
  'app/components/dashboard/StudentDashboard.vue',
]) {
  const source = read(file)
  for (const fake of ['todaySchedule', 'pendingTasks', 'upcomingAssignments', 'recentGrades', 'subjectProgress']) {
    assert.ok(!source.includes(`const ${fake} = [`), `${file} masih punya data palsu: ${fake}`)
  }
  assert.ok(!source.includes('Citra Siswa') && !source.includes('Bu Ani'), `${file} masih menampilkan contoh palsu`)
}

// 7) API absensi harus menerima org_admin/owner, bukan hanya "admin"
for (const file of ['server/api/attendance/index.get.ts', 'server/utils/attendanceAccess.ts']) {
  const source = read(file)
  assert.ok(source.includes('org_admin') && source.includes('owner'), `${file} belum mendukung org_admin/owner`)
}

console.log(`workflow gate: ${adminPages.length + adminRenderPages.length + 8} check lulus`)
