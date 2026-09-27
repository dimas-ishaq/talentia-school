// server/api/students/[id].patch.ts
// PATCH /api/students/:id — update data siswa.
// Polanya sama persis dengan teachers/[id].patch.ts supaya mudah dihafal.
// Catatan untuk pemula: email & password TIDAK diubah di sini (cukup di halaman akun).
import { db } from "~~/server/utils/db";
import { students, users } from "~~/server/database/schema";
import { eq, and, ne } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "~~/server/utils/requireAdmin";
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
  const admin = await requireAdmin(event);
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "ID siswa diperlukan" });
  }

  const body = await readBody(event);
  const parsed = updateStudentSchema.safeParse(body);
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message ?? "Data tidak valid",
    });
  }
  const data = parsed.data;

  // 1) Pastikan siswa ada
  const student = await db.query.students.findFirst({
    where: eq(students.id, id),
    columns: { id: true, userId: true },
  });
  if (!student) {
    throw createError({ statusCode: 404, statusMessage: "Siswa tidak ditemukan" });
  }

  // 2) Cek NIS duplikat (kecuali miliknya sendiri)
  const dupNis = await db.query.students.findFirst({
    where: and(eq(students.nis, data.nis), ne(students.id, id)),
    columns: { id: true },
  });
  if (dupNis) {
    throw createError({
      statusCode: 409,
      statusMessage: `NIS ${data.nis} sudah digunakan siswa lain`,
    });
  }

  // 3) Update atomik: nama di tabel users + sisanya di tabel students
  await db.transaction(async (tx) => {
    await tx.update(users).set({ name: data.name }).where(eq(users.id, student.userId));
    await tx
      .update(students)
      .set({
        nis: data.nis,
        classId: data.classId,
        gender: data.gender,
        birthDate: data.birthDate || null,
        phone: data.phone || null,
        address: data.address || null,
      })
      .where(eq(students.id, id));
  });

  await writeAuditLog({ userId: admin.id, action: 'student.update', target: id })
  return { success: true, message: "Data siswa berhasil diupdate" };
});
