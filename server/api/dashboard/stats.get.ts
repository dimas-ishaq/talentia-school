import { count, eq } from 'drizzle-orm'
import { classes, students, subjects, teachers } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireOrganization } from '~~/server/utils/tenant'

export default defineEventHandler(async (event) => {
  const { organization } = await requireOrganization(event)
  const [[studentCount], [teacherCount], [classCount], [subjectCount]] = await Promise.all([
    db.select({ value: count() }).from(students).where(eq(students.organizationId, organization.id)),
    db.select({ value: count() }).from(teachers).where(eq(teachers.organizationId, organization.id)),
    db.select({ value: count() }).from(classes).where(eq(classes.organizationId, organization.id)),
    db.select({ value: count() }).from(subjects).where(eq(subjects.organizationId, organization.id)),
  ])

  return {
    totalStudents: studentCount?.value ?? 0,
    totalTeachers: teacherCount?.value ?? 0,
    totalClasses: classCount?.value ?? 0,
    totalAnnouncements: 0,
    totalSubjects: subjectCount?.value ?? 0,
  }
})
