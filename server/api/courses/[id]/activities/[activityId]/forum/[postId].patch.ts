import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { forumPosts } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const postId = getRouterParam(event, 'postId')!
  const body = z.object({ content: z.string().trim().min(1).max(5000) }).parse(await readBody(event))
  const post = await db.query.forumPosts.findFirst({ where: eq(forumPosts.id, postId) })
  if (!post) throw createError({ statusCode: 404, statusMessage: 'Post tidak ditemukan' })
  if (post.userId !== user.id && !['admin', 'org_admin', 'owner', 'teacher'].includes(user.role)) throw createError({ statusCode: 403, statusMessage: 'Akses ditolak' })
  const [updated] = await db.update(forumPosts).set({ content: body.content, updatedAt: new Date() }).where(eq(forumPosts.id, postId)).returning()
  return { data: updated }
})
