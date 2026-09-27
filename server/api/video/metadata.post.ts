import { z } from 'zod'
import { parseVideoUrl } from '~~/utils/video'

const bodySchema = z.object({ url: z.string().url().max(1000) })

export default defineEventHandler(async (event) => {
  await requireUserSession(event)
  const body = bodySchema.parse(await readBody(event))
  const parsed = parseVideoUrl(body.url)
  if (!parsed || parsed.provider === 'direct') throw createError({ statusCode: 400, statusMessage: 'Hanya URL YouTube atau Vimeo yang didukung metadata otomatis' })
  let title: string | null = null
  let authorName: string | null = null
  try {
    const data = await $fetch<{ title?: string; author_name?: string }>('https://www.youtube.com/oembed', { query: { url: parsed.url, format: 'json' } })
    title = data.title || null
    authorName = data.author_name || null
  } catch { /* Metadata opsional; preview tetap tersedia. */ }
  return { success: true, data: { ...parsed, title, authorName } }
})
