// server/api/classes/[id]/students/[studentId].delete.ts
// DELETE /api/classes/:id/students/:studentId — hapus siswa dari kelas
import { db } from "~~/server/utils/db";
import { students } from "~~/server/database/schema";
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const classId = getRouterParam(event, "id");
  const studentId = getRouterParam(event, "studentId");

  if (!classId || !studentId) {
    throw createError({ statusCode: 400, statusMessage: "ID kelas & siswa diperlukan" });
  }

  // Cek siswa terdaftar di kelas ini
  const target = await db.query.students.findFirst({
    where: eq(students.id, studentId),
    columns: { id: true, classId: true },
  });

  if (!target) {
    throw createError({ statusCode: 404, statusMessage: "Siswa tidak ditemukan" });
  }

  if (target.classId !== classId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Siswa tidak terdaftar di kelas ini",
    });
  }

  // Hapus dari kelas (set classId ke NULL)
  await db
    .update(students)
    .set({ classId: null })
    .where(eq(students.id, studentId));

  return {
    success: true,
    message: "Siswa berhasil dihapus dari kelas",
  };
});