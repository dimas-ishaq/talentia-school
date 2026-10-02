// server/api/students/[id].delete.ts
// DELETE /api/students/:id — hapus siswa beserta akun usernya
import { db } from "~~/server/utils/db";
import { students, users } from "~~/server/database/schema";
import { eq, and } from "drizzle-orm";
import { requireOrganizationAdmin } from "~~/server/utils/tenant";
import { writeAuditLog } from "~~/server/utils/audit";

export default defineEventHandler(async (event) => {
  const { organization, user: admin } = await requireOrganizationAdmin(event);
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "ID siswa diperlukan" });
  }

  // Cari siswa (tenant-scoped)
  const student = await db.query.students.findFirst({
    where: and(eq(students.id, id), eq(students.organizationId, organization.id)),
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