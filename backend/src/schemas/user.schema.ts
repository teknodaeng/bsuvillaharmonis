import { z } from 'zod';

export const userCreateSchema = z.object({
  username: z.string().trim().min(3, 'Username minimal 3 karakter.').max(50),
  name: z.string().trim().min(1, 'Nama lengkap wajib diisi.').max(150),
  password: z.string().min(6, 'Kata sandi minimal 6 karakter.').max(100),
  role: z.enum(['ADMIN', 'NASABAH']).default('ADMIN'),
  email: z.string().email('Format email tidak valid.').optional().nullable(),
  phone: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

export const userUpdateSchema = z.object({
  username: z.string().trim().min(3).max(50).optional(),
  name: z.string().trim().min(1).max(150).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  role: z.enum(['ADMIN', 'NASABAH']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export const userStatusUpdateSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE'], {
    errorMap: () => ({ message: 'Status harus ACTIVE atau INACTIVE' }),
  }),
});

export const userResetPasswordSchema = z.object({
  new_password: z.string().min(6, 'Kata sandi baru minimal 6 karakter.').max(100),
});

export type UserCreateInput = z.infer<typeof userCreateSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
export type UserStatusUpdateInput = z.infer<typeof userStatusUpdateSchema>;
export type UserResetPasswordInput = z.infer<typeof userResetPasswordSchema>;
