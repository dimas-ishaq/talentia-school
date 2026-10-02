// server/utils/billing.ts — per-siswa/bulan (managed pilot, manual invoice)
import { and, count, eq } from 'drizzle-orm'
import { students } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

export async function countBillableStudents(organizationId: string): Promise<number> {
  const [row] = await db
    .select({ c: count() })
    .from(students)
    .where(and(eq(students.organizationId, organizationId), eq(students.isActive, true)))
  return row?.c ?? 0
}
// ponytail: periode pilot = snapshot akhir bulan, tanpa proration/pause.
// Upgrade: tambah proration mid-month + graduated tiers saat >10 sekolah / self-service.
