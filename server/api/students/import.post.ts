// server/api/students/import.post.ts
// POST /api/students/import — import banyak siswa dari CSV sekaligus.
// Sebelumnya file ini TIDAK ADA, sehingga tombol "Import CSV" selalu gagal.
//
// Body yang diterima (sudah divalidasi frontend oleh utils/studentImport.ts):
//   { students: [{ nis, name, className, gender, email?, password? }] }
import { db } from "~~/server/utils/db";
import { classes, students, users } from "~~/server/database/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcrypt";
import { requireOrganizationAdmin } from "~~/server/utils/tenant";

const importRowSchema = z.object({
  nis: z.string().min(1, "NIS wajib diisi").max(30),
  name: z.string().min(1, "Nama wajib diisi").max(100),
  className: z.string().min(1, "Kelas wajib diisi"),
  gender: z.enum(["L", "P"]),
  email: z.string().optional().default(""),
  password: z.string().optional().default(""),
});

const importBodySchema = z.object({
  students: importRowSchema.array().min(1, "Tidak ada data").max(500),
});

function defaultEmail(nis: string) {
  return `${nis}@siswa.sekolah.id`;
}

export default defineEventHandler(async (event) => {
  const { organization } = await requireOrganizationAdmin(event);
  const body = await readBody(event);
  const parsed = importBodySchema.safeParse(body);
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message ?? "Data import tidak valid",
    });
  }

  // Cache nama kelas -> id supaya tidak query berulang untuk 500 baris
  const allClasses = await db.query.classes.findMany({
    where: eq(classes.organizationId, organization.id),
    columns: { id: true, name: true },
  });
  const classMap = new Map(allClasses.map((c) => [c.name.toLowerCase(), c.id]));

  let success = 0;
  const errors: string[] = [];

  for (let i = 0; i < parsed.data.students.length; i++) {
    const row = parsed.data.students[i]!
    const baris = i + 2; // +2 karena baris 1 = header CSV

    // 1) Kelas harus sudah ada di master data (jangan auto-create diam-diam)
    const classId = classMap.get(row.className.toLowerCase());
    if (!classId) {
      errors.push(`Baris ${baris}: kelas "${row.className}" tidak ditemukan`);
      continue;
    }

    // 2) Lewati NIS / email yang sudah ada (tidak menggagalkan seluruh batch)
    const dupNis = await db.query.students.findFirst({
      where: and(eq(students.nis, row.nis), eq(students.organizationId, organization.id)),
      columns: { id: true },
    });
    if (dupNis) {
      errors.push(`Baris ${baris}: NIS ${row.nis} sudah terdaftar, dilewati`);
      continue;
    }

    const email = row.email || defaultEmail(row.nis);
    const dupEmail = await db.query.users.findFirst({
      where: eq(users.email, email),
      columns: { id: true },
    });
    if (dupEmail) {
      errors.push(`Baris ${baris}: email ${email} sudah digunakan, dilewati`);
      continue;
    }

    // 3) Simpan 1 siswa (user + student) secara atomik
    try {
      const hashedPassword = await bcrypt.hash(row.password || row.nis, 10);
      await db.transaction(async (tx) => {
        const userId = crypto.randomUUID();
        await tx.insert(users).values({
          id: userId,
          organizationId: organization.id,
          email,
          name: row.name,
          password: hashedPassword,
          role: "student",
        });
        await tx.insert(students).values({
          id: crypto.randomUUID(),
          organizationId: organization.id,
          userId,
          nis: row.nis,
          classId,
          gender: row.gender,
        });
      });
      success++;
    } catch {
      errors.push(`Baris ${baris}: gagal menyimpan ${row.nis}`);
    }
  }

  return { success, failed: errors.length, errors };
});
