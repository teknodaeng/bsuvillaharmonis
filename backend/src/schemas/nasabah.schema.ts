import { z } from 'zod';

export const nasabahCreateSchema = z.object({
  nik: z
    .string()
    .trim()
    .regex(/^\d{16}$/, 'NIK harus berupa 16 digit angka.'),
  name: z.string().trim().min(3, 'Nama lengkap minimal 3 karakter.'),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s]{8,20}$/, 'Format nomor HP tidak valid.'),
  address: z.string().trim().min(5, 'Alamat minimal 5 karakter.'),
  rt: z.string().optional().nullable(),
  rw: z.string().optional().nullable(),
  kelurahan: z.string().optional().nullable(),
  kecamatan: z.string().optional().nullable(),
  kabupaten_kota: z.string().optional().nullable(),
  nasabah_category: z.string().optional().default('Rumah Tangga/Individu'),
  email: z.string().email('Format email tidak valid.').optional().nullable(),
  password: z.string().min(8, 'Password minimal 8 karakter.'),
  terms_accepted: z.boolean().optional().nullable(),
});

export const nasabahUpdateSchema = z.object({
  nik: z
    .string()
    .trim()
    .regex(/^\d{16}$/, 'NIK harus berupa 16 digit angka.')
    .optional()
    .nullable(),
  name: z.string().trim().min(3, 'Nama lengkap minimal 3 karakter.').optional(),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s]{8,20}$/, 'Format nomor HP tidak valid.')
    .optional(),
  address: z.string().trim().min(5, 'Alamat minimal 5 karakter.').optional(),
  rt: z.string().optional().nullable(),
  rw: z.string().optional().nullable(),
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
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s]{8,20}$/, 'Format nomor HP tidak valid.')
    .optional(),
  address: z.string().trim().min(5, 'Alamat minimal 5 karakter.').optional(),
  rt: z.string().optional().nullable(),
  rw: z.string().optional().nullable(),
  kelurahan: z.string().optional().nullable(),
  kecamatan: z.string().optional().nullable(),
  kabupaten_kota: z.string().optional().nullable(),
  email: z.string().email('Format email tidak valid.').optional().nullable(),
});

export type NasabahCreateInput = z.infer<typeof nasabahCreateSchema>;
export type NasabahUpdateInput = z.infer<typeof nasabahUpdateSchema>;
export type NasabahSelfUpdateInput = z.infer<typeof nasabahSelfUpdateSchema>;
export type NasabahStatusUpdateInput = z.infer<typeof nasabahStatusUpdateSchema>;
