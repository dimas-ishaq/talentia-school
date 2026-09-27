// server/api/students/[id].get.ts
// GET /api/students/:id — ambil 1 siswa untuk halaman Edit.
// Sebelumnya file ini TIDAK ADA, sehingga tombol "Edit" selalu 404.
import { db } from "~~/server/utils/db";
import { students, users } from "~~/server/database/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "~~/server/utils/requireAdmin";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "ID siswa diperlukan" });
  }

  const rows = await db
    .select({
      id: students.id,
      nis: students.nis,
      name: users.name,
      email: users.email,
      classId: students.classId,
      gender: students.gender,
      birthDate: students.birthDate,
      phone: students.phone,
      address: students.address,
    })
    .from(students)
    .leftJoin(users, eq(students.userId, users.id))
    .where(eq(students.id, id))
    .limit(1);

  const row = rows[0];
  if (!row) {
    throw createError({ statusCode: 404, statusMessage: "Siswa tidak ditemukan" });
  }

  return { success: true, data: row };
});
