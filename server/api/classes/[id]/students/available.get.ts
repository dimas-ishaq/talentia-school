// server/api/classes/[id]/students/available.get.ts
// GET /api/classes/:id/students/available — daftar siswa yang belum di kelas ini
import { db } from "~~/server/utils/db";
import { students, users } from "~~/server/database/schema";
import { eq, asc, ne, or, isNull, sql } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const classId = getRouterParam(event, "id");
  if (!classId) {
    throw createError({ statusCode: 400, statusMessage: "ID kelas diperlukan" });
  }

  // Cari siswa yang: classId IS NULL ATAU classId != classId
  // (belum punya kelas atau di kelas lain)
  const rows = await db
    .select({
      id: students.id,
      nis: students.nis,
      gender: students.gender,
      classId: students.classId,
      name: users.name,
    })
    .from(students)
    .leftJoin(users, eq(students.userId, users.id))
    .where(
      or(
        isNull(students.classId),
        ne(students.classId, classId)
      )
    )
    .orderBy(asc(users.name));

  return { success: true, data: rows };
});