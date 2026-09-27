import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string({ error: 'Email wajib diisi' }).trim().email('Format email tidak valid'),
  password: z.string({ error: 'Password wajib diisi' }).min(1, 'Password wajib diisi'),
})

export const registerSchema = z.object({
  organizationName: z.string({ error: 'Nama sekolah wajib diisi' }).trim().min(2, 'Nama sekolah minimal 2 karakter').max(120, 'Nama sekolah maksimal 120 karakter'),
  username: z.string({ error: 'Username wajib diisi' }).trim().min(3, 'Username minimal 3 karakter').max(20, 'Username maksimal 20 karakter').regex(/^[a-zA-Z0-9_]+$/, 'Username hanya boleh huruf, angka, dan underscore'),
  email: z.string({ error: 'Email wajib diisi' }).trim().email('Format email tidak valid'),
  password: z.string({ error: 'Password wajib diisi' }).min(8, 'Password minimal 8 karakter').regex(/[A-Z]/, 'Password harus mengandung huruf besar').regex(/[a-z]/, 'Password harus mengandung huruf kecil').regex(/[0-9]/, 'Password harus mengandung angka').regex(/[^a-zA-Z0-9]/, 'Password harus mengandung minimal 1 simbol'),
  confirmPassword: z.string({ error: 'Konfirmasi password wajib diisi' }),
  tos: z.literal(true, { error: 'Anda harus menyetujui S&K' }).optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Password tidak sama',
  path: ['confirmPassword'],
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
