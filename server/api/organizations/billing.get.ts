// GET /api/organizations/billing — jumlah siswa tertagih (read-only, operator lihat manual)
import { requireOrganization } from '~~/server/utils/tenant'
import { countBillableStudents } from '~~/server/utils/billing'

export default defineEventHandler(async (event) => {
  const { organization } = await requireOrganization(event)
  const billableStudents = await countBillableStudents(organization.id)
  const now = new Date()
  return {
    data: {
      organizationId: organization.id,
      billableStudents,
      period: `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`,
    },
  }
})
