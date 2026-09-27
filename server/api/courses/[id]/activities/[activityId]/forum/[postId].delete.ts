import { eq } from 'drizzle-orm'
import { forumPosts } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const postId = getRouterParam(event, 'postId')!
  const post = await db.query.forumPosts.findFirst({ where: eq(forumPosts.id, postId) })
  if (!post) throw createError({ statusCode: 404, statusMessage: 'Post tidak ditemukan' })
  if (post.userId !== user.id && !['admin', 'org_admin', 'owner', 'teacher'].includes(user.role)) throw createError({ statusCode: 403, statusMessage: 'Akses ditolak' })
  await db.delete(forumPosts).where(eq(forumPosts.id, postId))
  return { success: true }
})
