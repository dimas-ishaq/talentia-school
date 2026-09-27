import { asc, eq } from 'drizzle-orm'
import { settings } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requireOrganizationAdmin } from '~~/server/utils/tenant'

export default defineEventHandler(async (event) => {
  const { organization } = await requireOrganizationAdmin(event)
  return { data: await db.select().from(settings).where(eq(settings.organizationId, organization.id)).orderBy(asc(settings.key)) }
})
