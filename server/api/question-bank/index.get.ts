import { and, asc, eq, like, or, inArray } from 'drizzle-orm'
import { questionBank, questionOptions } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const query = getQuery(event)
  const scope = typeof query.scope === 'string' && query.scope ? query.scope : undefined
  const courseId = typeof query.courseId === 'string' && query.courseId ? query.courseId : undefined
  const categoryId = typeof query.categoryId === 'string' && query.categoryId ? query.categoryId : undefined
  const search = typeof query.search === 'string' ? query.search.trim() : ''

  const filters: any[] = [eq(questionBank.isActive, true)]
  if (scope) filters.push(eq(questionBank.scope, scope as 'global' | 'category' | 'course' | 'quiz'))
  if (courseId) filters.push(eq(questionBank.courseId, courseId))
  if (categoryId) filters.push(eq(questionBank.categoryId, categoryId))
  if (search) filters.push(like(questionBank.question, `%${search}%`))

  const rows = await db.select().from(questionBank).where(and(...filters)).orderBy(asc(questionBank.createdAt))

  // Guru boleh melihat soal global + soalnya sendiri. Admin lihat semua.
  const visible = user.role === 'admin'
    ? rows
    : rows.filter((row) => row.scope === 'global' || row.createdBy === user.id)

  const ids = visible.map((r) => r.id)
  const options = ids.length
    ? await db.select().from(questionOptions).where(inArray(questionOptions.questionId, ids))
    : []
  const optionMap = new Map<string, typeof options>()
  for (const opt of options) {
    const list = optionMap.get(opt.questionId) ?? []
    list.push(opt)
    optionMap.set(opt.questionId, list)
  }

  return {
    data: visible.map((row) => ({ ...row, options: optionMap.get(row.id) ?? [] })),
  }
})
