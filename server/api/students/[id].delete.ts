// server/api/students/[id].delete.ts
// DELETE /api/students/:id — hapus siswa beserta akun usernya
import { db } from "~~/server/utils/db";
import { students, users } from "~~/server/database/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "~~/server/utils/requireAdmin";
import { writeAuditLog } from "~~/server/utils/audit";

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event);
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "ID siswa diperlukan" });
  }

  // Cari siswa
  const student = await db.query.students.findFirst({
    where: eq(students.id, id),
    columns: { id: true, userId: true },
  });

  if (!student) {
    throw createError({ statusCode: 404, statusMessage: "Siswa tidak ditemukan" });
  }

  // Hapus dalam transaksi (cascade manual karena SQLite)
  await db.transaction(async (tx) => {
    await tx.delete(students).where(eq(students.id, id));
    await tx.delete(users).where(eq(users.id, student.userId));
  });

  await writeAuditLog({ userId: admin.id, action: 'student.delete', target: id })
  return {
    success: true,
    message: "Siswa berhasil dihapus",
  };
});