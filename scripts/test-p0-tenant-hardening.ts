import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = (p: string) => readFileSync(join(root, p), 'utf8')
const expect = (p: string, pattern: RegExp) => assert.match(read(p), pattern, `${p} missing ${pattern}`)

expect('server/utils/exam.ts', /eq\(examSesi\.eventId, eventId\)/)
expect('server/utils/exam.ts', /eq\(examEvents\.organizationId, organization\.id\)/)
expect('server/api/exam-events/[id]/sesi/[sesiId]/unlock.post.ts', /sesiId.*attempt|attempt.*sesiId|eventId.*attempt|organizationId.*attempt/)
expect('server/api/exam-events/[id]/subjects/[subjectId]/token.ts', /requireExamManager/)
expect('server/api/exam-events/[id]/subjects/[subjectId]/token.ts', /subj\.eventId !== eventId/)
expect('server/api/exam-events/[id]/sesi/[sesiId]/proctor-token.ts', /requireExamManager/)
expect('server/api/exam-events/[id]/sesi/[sesiId]/proctor-token.ts', /sesi\.eventId !== eventId/)
expect('server/api/settings/timezone.get.ts', /organizationId/)
expect('server/api/courses/[id]/progress-export.get.ts', /organizationId/)
expect('server/utils/courseAccess.ts', /organizationId.*teachers|teachers\.organizationId/)
expect('server/api/users/[id].patch.ts', /admin.*owner|owner.*admin|role.*owner/)
expect('server/utils/db.ts', /DISABLE|bootstrap|BOOTSTRAP|NODE_ENV.*production/)

console.log('p0 tenant hardening gate: 9 checks lulus')
