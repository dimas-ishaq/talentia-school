// server/api/subjects/index.get.ts
// GET /api/subjects — daftar semua mapel, urut nama A-Z.
// Jumlah mapel sedikit (< 50), jadi tanpa pagination seperti /api/classes.
import { db } from "~~/server/utils/db";
import { subjects } from "~~/server/database/schema";
import { asc, eq } from "drizzle-orm";
import { requireOrganization } from '~~/server/utils/tenant'

export default defineEventHandler(async (event) => {
  const { organization } = await requireOrganization(event)
  const rows = await db
    .select({
      id: subjects.id,
      code: subjects.code,
      name: subjects.name,
      description: subjects.description,
      isActive: subjects.isActive,
    })
    .from(subjects)
    .where(eq(subjects.organizationId, organization.id))
    .orderBy(asc(subjects.name));

  return { data: rows };
});
