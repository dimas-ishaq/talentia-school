import { requireOrganization } from '~~/server/utils/tenant'

export default defineEventHandler(async (event) => {
  const { organization, membership } = await requireOrganization(event)
  return {
    data: {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      status: organization.status,
      role: membership.role,
    },
  }
})
