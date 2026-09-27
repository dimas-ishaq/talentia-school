import { z } from 'zod'

export const announcementSchema = z.object({
  title: z.string({ error: 'Judul wajib diisi' }).trim().min(3, 'Judul minimal 3 karakter').max(150, 'Judul maksimal 150 karakter'),
  content: z.string({ error: 'Isi pengumuman wajib diisi' }).trim().min(3, 'Isi pengumuman minimal 3 karakter').max(5000, 'Isi pengumuman maksimal 5000 karakter'),
  isPublished: z.boolean().optional().default(false),
})

export type AnnouncementInput = z.infer<typeof announcementSchema>
