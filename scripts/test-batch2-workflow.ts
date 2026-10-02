import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
const root = process.cwd()
const read = (p: string) => readFileSync(join(root, p), 'utf8')

const parentApi = read('server/api/parent/dashboard.get.ts')
assert.match(parentApi, /parentId/)
assert.match(parentApi, /requireOrganization/)
assert.match(parentApi, /attendance/)
assert.match(parentApi, /finalGrades/)
const parentView = read('app/components/dashboard/ParentDashboard.vue')
assert.match(parentView, /\/api\/parent\/dashboard/)
assert.match(parentView, /children/)
assert.doesNotMatch(parentView, /Data Anak Belum Terhubung/)

const exam = read('app/components/features/exams/StudentExamAttemptView.vue')
assert.match(exam, /expiresAt/)
assert.match(exam, /setInterval/)
assert.match(exam, /autosave|auto-save|saveAnswer/i)
assert.match(exam, /auto.*submit|submit.*auto/i)
const submit = read('server/api/student/exam-attempts/[attemptId]/submit.post.ts')
assert.match(submit, /expiresAt|durationMinutes/)
console.log('batch2 workflow gate: 10 check lulus')
