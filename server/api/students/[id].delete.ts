// server/api/students/[id].delete.ts
import { db } from "~~/server/utils/db";
import { students, users } from "~~/server/database/schema";
import { eq, and } from "drizzle-orm";
import { requireOrganizationAdmin } from "~~/server/utils/tenant";
import { writeAuditLog } from "~~/server/utils/audit";

export default defineEventHandler(async (event) => {
  const { organization, user: admin } = await requireOrganizationAdmin(event);
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, statusMessage: "ID siswa diperlukan" });

  const student = await db.query.students.findFirst({
    where: and(eq(students.id, id), eq(students.organizationId, organization.id)),
    columns: { id: true, userId: true },
  });
  if (!student) throw createError({ statusCode: 404, statusMessage: "Siswa tidak ditemukan" });

  await db.delete(students).where(and(eq(students.id, id), eq(students.organizationId, organization.id)));
  await db.delete(users).where(eq(users.id, student.userId));
  await writeAuditLog({ userId: admin.id, action: 'student.delete', target: id })
  return { success: true, message: "Siswa berhasil dihapus" };
});