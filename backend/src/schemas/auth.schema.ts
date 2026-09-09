import { z } from 'zod';
import { rtSchema, rwSchema, nikSchema, phoneSchema } from './nasabah.schema.js';

export const registerSchema = z.object({
  nik: nikSchema,
  name: z.string().trim().min(3, 'Nama lengkap minimal 3 karakter.'),
  phone: phoneSchema,
  address: z.string().trim().min(5, 'Alamat minimal 5 karakter.'),
  rt: rtSchema,
  rw: rwSchema,
  kelurahan: z.string().optional().nullable(),
  kecamatan: z.string().optional().nullable(),
  kabupaten_kota: z.string().optional().nullable(),
  nasabah_category: z.string().optional().default('Rumah Tangga/Individu'),
  email: z.string().email('Format email tidak valid.').optional().nullable(),
  password: z.string().min(8, 'Password minimal 8 karakter.'),
  terms_accepted: z.boolean().optional().nullable(),
});

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'ID Nasabah, No Rekening, NIK, atau Username wajib diisi.'),
  password: z.string().min(1, 'Password wajib diisi.'),
});

export const refreshTokenSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token wajib diisi.'),
});

export const changePasswordSchema = z
  .object({
    old_password: z.string().optional(),
    current_password: z.string().optional(),
    new_password: z.string().min(8, 'Password baru minimal 8 karakter.'),
    confirm_password: z.string().optional(),
  })
  .refine(
    (data) => Boolean(data.old_password || data.current_password),
    {
      message: 'Password saat ini (old_password) wajib diisi.',
      path: ['old_password'],
    }
  )
  .refine(
    (data) => !data.confirm_password || data.new_password === data.confirm_password,
    {
      message: 'Konfirmasi password baru tidak cocok.',
      path: ['confirm_password'],
    }
  );

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
