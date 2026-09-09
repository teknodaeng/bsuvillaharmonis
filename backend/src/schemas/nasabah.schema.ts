import { z } from 'zod';

export const rtSchema = z
  .union(
    [
      z.number().int().min(0).max(999),
      z.string().trim().regex(/^\d{1,3}$/),
    ],
    {
      errorMap: () => ({ message: 'RT harus berupa angka 1 sampai 3 digit (contoh: 1 atau 001).' }),
    }
  )
  .transform((val) => (val === undefined ? undefined : String(val).trim()))
  .optional()
  .nullable()
  .or(z.literal('').transform(() => null));

export const rwSchema = z
  .union(
    [
      z.number().int().min(0).max(999),
      z.string().trim().regex(/^\d{1,3}$/),
    ],
    {
      errorMap: () => ({ message: 'RW harus berupa angka 1 sampai 3 digit (contoh: 1 atau 001).' }),
    }
  )
  .transform((val) => (val === undefined ? undefined : String(val).trim()))
  .optional()
  .nullable()
  .or(z.literal('').transform(() => null));

export const nikSchema = z
  .union([
    z.string().trim(),
    z.number().transform((v) => String(v)),
  ])
  .refine((v) => /^\d{16}$/.test(v), {
    message: 'NIK harus berupa 16 digit angka.',
  });

export const phoneSchema = z
  .union([
    z.string().trim(),
    z.number().transform((v) => String(v)),
  ])
  .refine((v) => /^[0-9+\-\s]{8,20}$/.test(v), {
    message: 'Format nomor HP tidak valid (8-20 digit).',
  });

export const nasabahCreateSchema = z.object({
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

export const nasabahUpdateSchema = z.object({
  nik: nikSchema.optional().nullable(),
  name: z.string().trim().min(3, 'Nama lengkap minimal 3 karakter.').optional(),
  phone: phoneSchema.optional(),
  address: z.string().trim().min(5, 'Alamat minimal 5 karakter.').optional(),
  rt: rtSchema,
  rw: rwSchema,
  kelurahan: z.string().optional().nullable(),
  kecamatan: z.string().optional().nullable(),
  kabupaten_kota: z.string().optional().nullable(),
  nasabah_category: z.string().optional().nullable(),
  email: z.string().email('Format email tidak valid.').optional().nullable(),
});

export const nasabahStatusUpdateSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE'], {
    errorMap: () => ({ message: 'Status nasabah harus ACTIVE atau INACTIVE' }),
  }),
});

// Self-update schema for Nasabah (NIK and category cannot be altered by nasabah)
export const nasabahSelfUpdateSchema = z.object({
  name: z.string().trim().min(3, 'Nama lengkap minimal 3 karakter.').optional(),
  phone: phoneSchema.optional(),
  address: z.string().trim().min(5, 'Alamat minimal 5 karakter.').optional(),
  rt: rtSchema,
  rw: rwSchema,
  kelurahan: z.string().optional().nullable(),
  kecamatan: z.string().optional().nullable(),
  kabupaten_kota: z.string().optional().nullable(),
  email: z.string().email('Format email tidak valid.').optional().nullable(),
});

export type NasabahCreateInput = z.infer<typeof nasabahCreateSchema>;
export type NasabahUpdateInput = z.infer<typeof nasabahUpdateSchema>;
export type NasabahSelfUpdateInput = z.infer<typeof nasabahSelfUpdateSchema>;
export type NasabahStatusUpdateInput = z.infer<typeof nasabahStatusUpdateSchema>;
