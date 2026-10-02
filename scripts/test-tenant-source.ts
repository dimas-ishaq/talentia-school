import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const mustScope = [
  'server/api/courses/[id]/my-final-grade.get.ts',
  'server/api/courses/[id]/activities/[activityId]/complete.post.ts',
  'server/api/courses/[id]/activities/[activityId]/submit.post.ts',
  'server/api/courses/[id]/quizzes/[quizId]/info.get.ts',
  'server/api/courses/[id]/quizzes/[quizId]/attempts/[attemptId].get.ts',
  'server/api/courses/[id]/quizzes/[quizId]/attempts/event.post.ts',
  'server/api/student/exam-sessions.get.ts',
  'server/api/student/exam-sessions/[sessionId]/start.post.ts',
  'server/api/student/exam-attempts/[attemptId]/submit.post.ts',
  'server/api/uploads.post.ts',
  'server/api/question-bank/index.post.ts',
  'server/api/question-bank/[id].patch.ts',
  'server/api/question-bank/import.post.ts',
  'server/api/quizzes-analysis-list.get.ts',
]

for (const file of mustScope) {
  const source = readFileSync(join(root, file), 'utf8')
  assert.match(source, /requireOrganization|requireCourseManager|requireQuizActivity|requireEnrolledStudent|requirePackageManager/, `${file} belum memakai guard tenant`)
}
console.log(`tenant source gate: ${mustScope.length}/${mustScope.length} scoped`)
