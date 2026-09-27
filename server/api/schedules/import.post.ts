// server/api/schedules/import.post.ts
// POST /api/schedules/import — bulk import jadwal dari CSV.
// Body: { rows: [{ dayOfWeek, startTime, endTime, subject, className, teacherName?, room?, note? }] }
// Frontend sudah memvalidasi format (utils/scheduleImport.ts); server memvalidasi
// relasi ke master data (kelas/mapel/guru) + bentrok jadwal.
import { db } from "~~/server/utils/db";
import {
  scheduleEntries,
  subjects,
  classes,
  teachers,
} from "~~/server/database/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "~~/server/utils/requireAdmin";
import { timeToMinutes } from "~~/server/utils/schedule";

const ROW_SCHEMA = z.object({
  dayOfWeek: z.number().min(1).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  subject: z.string().min(1, "Mapel wajib diisi"),
  className: z.string().min(1, "Kelas wajib diisi"),
  teacherName: z.string().min(1, "Guru wajib diisi"),
  room: z.string().optional().default(""),
  note: z.string().optional().default(""),
});

interface EntryLite {
  startTime: string;
  endTime: string;
  teacherId: string | null;
  classId: string;
}

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event);

  const body = await readBody(event);
  const parsed = z
    .object({ rows: ROW_SCHEMA.array().min(1).max(500) })
    .safeParse(body);

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message ?? "Data import tidak valid",
    });
  }

  // ----- Resolve master data sekali saja (hindari query berulang) -----
  const allClasses = await db.query.classes.findMany({
    columns: { id: true, name: true },
  });
  const classMap = new Map(allClasses.map((c) => [c.name.trim().toLowerCase(), c.id]));

  const allSubjects = await db.query.subjects.findMany({
    columns: { id: true, code: true, name: true },
  });
  const subjectByCode = new Map<string, string>();
  const subjectByName = new Map<string, string>();
  for (const s of allSubjects) {
    subjectByCode.set(s.code.trim().toLowerCase(), s.id);
    subjectByName.set(s.name.trim().toLowerCase(), s.id);
  }

  const allTeachers = await db.query.teachers.findMany({
    columns: { id: true },
    with: { user: { columns: { name: true } } },
  });
  const teacherByName = new Map<string, string>();
  for (const t of allTeachers) {
    const key = (t.user?.name ?? "").trim().toLowerCase();
    if (key && !teacherByName.has(key)) teacherByName.set(key, t.id); // first match wins
  }

  // ----- Muat jadwal aktif yang sudah ada, dipakai untuk cek bentrok -----
  const existing = await db
    .select({
      startTime: scheduleEntries.startTime,
      endTime: scheduleEntries.endTime,
      teacherId: scheduleEntries.teacherId,
      classId: scheduleEntries.classId,
      dayOfWeek: scheduleEntries.dayOfWeek,
    })
    .from(scheduleEntries)
    .where(eq(scheduleEntries.isActive, true));

  // Kelompokkan per hari supaya pengecekan cepat
  const byDay = new Map<number, EntryLite[]>();
  for (const e of existing) {
    const list = byDay.get(e.dayOfWeek) ?? [];
    list.push({ startTime: e.startTime, endTime: e.endTime, teacherId: e.teacherId, classId: e.classId });
    byDay.set(e.dayOfWeek, list);
  }

  let success = 0;
  const errors: string[] = [];

  for (let i = 0; i < parsed.data.rows.length; i++) {
    const row = parsed.data.rows[i]!;
    const rowNum = i + 2; // baris 1 = header CSV

    // --- Kelas wajib ada di master data ---
    const classId = classMap.get(row.className.trim().toLowerCase());
    if (!classId) {
      errors.push(`Baris ${rowNum}: kelas "${row.className}" tidak ditemukan`);
      continue;
    }

    // --- Mapel: cocokkan berdasarkan kode ATAU nama ---
    const subjectKey = row.subject.trim().toLowerCase();
    const subjectId = subjectByCode.get(subjectKey) ?? subjectByName.get(subjectKey);
    if (!subjectId) {
      errors.push(`Baris ${rowNum}: mata pelajaran "${row.subject}" tidak ditemukan`);
      continue;
    }

    // --- Guru wajib: harus ada di master data ---
    const teacherId = teacherByName.get(row.teacherName.trim().toLowerCase()) ?? null;
    if (!teacherId) {
      errors.push(`Baris ${rowNum}: guru "${row.teacherName}" tidak ditemukan`);
      continue;
    }

    // --- Validasi jam ---
    const startMin = timeToMinutes(row.startTime);
    const endMin = timeToMinutes(row.endTime);
    if (startMin === null || endMin === null || endMin <= startMin) {
      errors.push(`Baris ${rowNum}: waktu tidak valid (jam selesai harus > jam mulai)`);
      continue;
    }

    // --- Cek bentrok: kelas/guru sama di hari sama & jam tumpang tindih ---
    // Termasuk baris yang baru saja dimasukkan di batch ini (sudah masuk list).
    const dayEntries = byDay.get(row.dayOfWeek) ?? [];
    let conflict: string | null = null;
    for (const e of dayEntries) {
      const eStart = timeToMinutes(e.startTime);
      const eEnd = timeToMinutes(e.endTime);
      if (eStart === null || eEnd === null) continue;
      const overlap = startMin < eEnd && endMin > eStart;
      if (!overlap) continue;
      if (e.classId === classId) {
        conflict = `bentrok jadwal kelas pada jam ${e.startTime}-${e.endTime}`;
        break;
      }
      if (teacherId && e.teacherId === teacherId) {
        conflict = `guru sudah mengajar pada jam ${e.startTime}-${e.endTime}`;
        break;
      }
    }
    if (conflict) {
      errors.push(`Baris ${rowNum}: ${conflict}`);
      continue;
    }

    // --- Simpan ---
    try {
      await db.insert(scheduleEntries).values({
        id: crypto.randomUUID(),
        dayOfWeek: row.dayOfWeek,
        startTime: row.startTime,
        endTime: row.endTime,
        subjectId,
        classId,
        teacherId,
        room: row.room.trim() || null,
        note: row.note.trim() || null,
        createdBy: user.id,
      });
      // Daftarkan ke list harian agar baris berikutnya mendeteksi bentrok dgn baris ini
      const list = byDay.get(row.dayOfWeek) ?? [];
      list.push({ startTime: row.startTime, endTime: row.endTime, teacherId, classId });
      byDay.set(row.dayOfWeek, list);
      success++;
    } catch (e: unknown) {
      console.error("Import schedule insert error:", e);
      errors.push(`Baris ${rowNum}: gagal menyimpan jadwal`);
    }
  }

  return { success, failed: errors.length, errors };
});
