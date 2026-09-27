import { and, asc, eq, inArray } from 'drizzle-orm'
import { questionBank, questionOptions, questionPackages } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'
import { requirePackageManager } from '~~/server/utils/questionPackage'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const pkg = await requirePackageManager(event, id)

  const questions = await db
    .select()
    .from(questionBank)
    .where(and(eq(questionBank.packageId, id), eq(questionBank.isActive, true)))
    .orderBy(asc(questionBank.createdAt))

  const ids = questions.map((q) => q.id)
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
    data: {
      ...pkg,
      questions: questions.map((q) => ({ ...q, options: optionMap.get(q.id) ?? [] })),
    },
  }
})
