// server/api/students/index.post.ts
import { db } from "~~/server/utils/db";
import { students, users } from "~~/server/database/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcrypt";
import { requireOrganizationAdmin } from "~~/server/utils/tenant";

const createStudentSchema = z.object({
  // Data user
  name: z.string().min(1, "Nama wajib diisi").max(100),
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),

  // Data siswa
  nis: z.string().min(1, "NIS wajib diisi").max(30),
  classId: z.string().min(1, "Kelas wajib dipilih"),
  gender: z.enum(["L", "P"], { message: "Gender wajib dipilih" }),

  // Opsional
  birthDate: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  address: z.string().optional().default(""),
});

export default defineEventHandler(async (event) => {
  const { organization } = await requireOrganizationAdmin(event);
  const body = await readBody(event);
  const parsed = createStudentSchema.safeParse(body);

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message ?? "Data tidak valid",
    });
  }

  const data = parsed.data;

  // 1) Cek NIS duplikat
  const existingStudent = await db.query.students.findFirst({
    where: and(eq(students.nis, data.nis), eq(students.organizationId, organization.id)),
    columns: { id: true },
  });
  if (existingStudent) {
    throw createError({
      statusCode: 409,
      statusMessage: `NIS ${data.nis} sudah terdaftar`,
    });
  }

  // 2) Cek email duplikat
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, data.email),
    columns: { id: true },
  });
  if (existingUser) {
    throw createError({
      statusCode: 409,
      statusMessage: `Email ${data.email} sudah digunakan`,
    });
  }

  // 3) Hash password
  const hashedPassword = await bcrypt.hash(data.password, 10);

  // 4) Transaksi: buat user + student atomik
  const studentId = await db.transaction(async (tx) => {
    const userId = crypto.randomUUID();
    const newStudentId = crypto.randomUUID();

    await tx.insert(users).values({
      id: userId,
      organizationId: organization.id,
      email: data.email,
      name: data.name,
      password: hashedPassword,
      role: "student", // lowercase sesuai enum schema kamu
    });

    await tx.insert(students).values({
      id: newStudentId,
      organizationId: organization.id,
      userId,
      nis: data.nis,
      classId: data.classId,
      gender: data.gender,
      birthDate: data.birthDate || null,
      phone: data.phone || null,
      address: data.address || null,
    });

    return newStudentId;
  });

  return {
    success: true,
    data: { id: studentId },
    message: "Siswa berhasil ditambahkan",
  };
});
