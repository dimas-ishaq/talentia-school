import { allowedAttendanceScopes } from '~~/server/utils/attendanceAccess'

// GET /api/attendance/scopes
// Mengembalikan pasangan (classId, subjectId) yang boleh diakses.
// Admin → null (artinya semua kelas & mapel).
export default defineEventHandler(async (event) => {
  const scopes = await allowedAttendanceScopes(event)
  return { data: scopes, all: scopes === null }
})
