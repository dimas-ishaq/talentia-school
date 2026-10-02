// server/api/students/[id].patch.ts
import { db } from "~~/server/utils/db";
import { students, users } from "~~/server/database/schema";
import { eq, and, ne } from "drizzle-orm";
import { z } from "zod";
import { requireOrganizationAdmin } from "~~/server/utils/tenant";
import { writeAuditLog } from "~~/server/utils/audit";

const updateStudentSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi").max(100),
  nis: z.string().min(1, "NIS wajib diisi").max(30),
  classId: z.string().min(1, "Kelas wajib dipilih"),
  gender: z.enum(["L", "P"], { message: "Gender wajib dipilih" }),
  birthDate: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  address: z.string().optional().default(""),
});

export default defineEventHandler(async (event) => {
  const { organization, user: admin } = await requireOrganizationAdmin(event);
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, statusMessage: "ID siswa diperlukan" });

  const parsed = updateStudentSchema.safeParse(await readBody(event));
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: parsed.error.issues[0]?.message ?? "Data tidak valid" });
  const data = parsed.data;

  const student = await db.query.students.findFirst({
    where: and(eq(students.id, id), eq(students.organizationId, organization.id)),
    columns: { id: true, userId: true },
  });
  if (!student) throw createError({ statusCode: 404, statusMessage: "Siswa tidak ditemukan" });

  const dupNis = await db.query.students.findFirst({
    where: and(eq(students.nis, data.nis), ne(students.id, id), eq(students.organizationId, organization.id)),
    columns: { id: true },
  });
  if (dupNis) throw createError({ statusCode: 409, statusMessage: `NIS ${data.nis} sudah digunakan siswa lain` });

  await db.update(users).set({ name: data.name }).where(eq(users.id, student.userId));
  await db.update(students).set({
    nis: data.nis,
    classId: data.classId,
    gender: data.gender,
    birthDate: data.birthDate || null,
    phone: data.phone || null,
    address: data.address || null,
  }).where(and(eq(students.id, id), eq(students.organizationId, organization.id)));

  await writeAuditLog({ userId: admin.id, action: 'student.update', target: id })
  return { success: true, message: "Data siswa berhasil diupdate" };
});