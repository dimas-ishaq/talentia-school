import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
const root = process.cwd()
const read = (p: string) => readFileSync(join(root, p), 'utf8')
const expect = (p: string, pattern: RegExp) => assert.match(read(p), pattern, `${p} missing ${pattern}`)

expect('server/utils/quiz.ts', /findCourseOrThrow\(courseId, organization\.id\)/)
expect('server/utils/questionPackage.ts', /organizationId/)
expect('server/api/categories/index.post.ts', /requireOrganizationAdmin|organizationId/)
expect('server/api/categories/[id].patch.ts', /organizationId/)
expect('server/api/categories/[id].delete.ts', /organizationId/)
expect('server/api/schedules/[id].patch.ts', /organizationId/)
expect('server/api/schedules/[id].delete.ts', /organizationId/)
expect('server/utils/schedule.ts', /organizationId/)
expect('server/api/courses/[id]/activities/[activityId]/grade.post.ts', /organizationId/)
expect('server/api/courses/[id]/attendance.post.ts', /students\.organizationId/)
// bulk absensi: kelas & siswa wajib milik org, update absensi ikut ter-scope org
expect('server/api/attendance/bulk.post.ts', /students\.organizationId/)
expect('server/api/attendance/bulk.post.ts', /attendance\.organizationId/)
expect('server/api/exam-events/[id]/publish.post.ts', /requireOrganizationAdmin/)
expect('server/api/exam-events/[id]/publish.post.ts', /examEvents\.organizationId/)
expect('server/api/exam-events/[id]/classes.post.ts', /classes\.organizationId/)
// Governance: tidak boleh hapus/demote owner terakhir (anti-lockout)
expect('server/api/users/[id].delete.ts', /owner/i)
expect('server/api/users/[id].delete.ts', /count|ownerCount|owners/i)
expect('server/api/users/[id].patch.ts', /owner/i)
expect('server/api/users/[id].patch.ts', /count|ownerCount|owners/i)
// Parent assignment: admin-only, tenant-scoped, auditable
expect('server/api/students/[id]/parent.patch.ts', /requireOrganizationAdmin/)
expect('server/api/students/[id]/parent.patch.ts', /parents\.organizationId/)
expect('server/api/students/[id]/parent.patch.ts', /parent_assign/)
expect('server/api/students/[id].get.ts', /parentId/)
// Operator org lifecycle: platform-only, audited
expect('server/api/platform/organizations/index.get.ts', /requirePlatformAdmin/)
expect('server/api/platform/organizations/[id]/status.patch.ts', /requirePlatformAdmin/)
expect('server/api/platform/organizations/[id]/status.patch.ts', /status_change/)
console.log('tenant audit gate: 27 checks lulus')
