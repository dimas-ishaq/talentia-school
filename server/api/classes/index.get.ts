// server/api/classes/index.get.ts
import { db } from "~~/server/utils/db";
import { classes, teachers, users } from "~~/server/database/schema";
import { eq, asc, count, sql } from "drizzle-orm";
import { students } from "~~/server/database/schema";
import { requireOrganization } from "~~/server/utils/tenant";

export default defineEventHandler(async (event) => {
  const { organization } = await requireOrganization(event)
  const rows = await db
    .select({
      id: classes.id,
      name: classes.name,
      level: classes.level,
      teacherId: classes.teacherId,
      teacherName: users.name,
      isActive: classes.isActive,
      studentCount: sql<number>`(
        SELECT COUNT(*) FROM ${students}
        WHERE ${students.classId} = ${classes.id}
      )`.as("student_count"),
    })
    .from(classes)
    .leftJoin(teachers, eq(classes.teacherId, teachers.id))
    .leftJoin(users, eq(teachers.userId, users.id))
    .where(eq(classes.organizationId, organization.id))
    .orderBy(asc(classes.level), asc(classes.name));

  return { data: rows };
});
