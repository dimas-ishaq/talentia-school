// server/api/classes/[id]/students/index.post.ts
// POST /api/classes/:id/students — tambah siswa ke kelas
import { db } from "~~/server/utils/db";
import { students } from "~~/server/database/schema";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";

const addStudentsSchema = z.object({
  studentIds: z.array(z.string().min(1)).min(1, "Pilih minimal 1 siswa"),
});

export default defineEventHandler(async (event) => {
  const classId = getRouterParam(event, "id");
  if (!classId) {
    throw createError({ statusCode: 400, statusMessage: "ID kelas diperlukan" });
  }

  const body = await readBody(event);
  const parsed = addStudentsSchema.safeParse(body);

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message ?? "Data tidak valid",
    });
  }

  const { studentIds } = parsed.data;

  // Update classId siswa terpilih
  await db
    .update(students)
    .set({ classId })
    .where(inArray(students.id, studentIds));

  return {
    success: true,
    data: { count: studentIds.length },
    message: `${studentIds.length} siswa berhasil ditambahkan ke kelas`,
  };
});