import { z } from 'zod';

export const priceCreateSchema = z.object({
  category_id: z.string().min(1, 'ID kategori wajib diisi.'),
  price_per_kg: z.number().int().positive('Harga per kg harus berupa angka positif.'),
  price_code: z.string().trim().max(50).optional().nullable(),
  group_name: z.string().trim().max(100).optional().nullable(),
  example_items: z.string().trim().max(500).optional().nullable(),
  effective_date: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  notes: z.string().trim().max(500).optional().nullable(),
});

export const priceUpdateSchema = z.object({
  category_id: z.string().optional(),
  price_per_kg: z.number().int().positive().optional(),
  price_code: z.string().trim().max(50).optional().nullable(),
  group_name: z.string().trim().max(100).optional().nullable(),
  example_items: z.string().trim().max(500).optional().nullable(),
  effective_date: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  notes: z.string().trim().max(500).optional().nullable(),
});

export const priceStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE'], {
    errorMap: () => ({ message: 'Status harus ACTIVE atau INACTIVE' }),
  }),
});

export type PriceCreateInput = z.infer<typeof priceCreateSchema>;
export type PriceUpdateInput = z.infer<typeof priceUpdateSchema>;
export type PriceStatusInput = z.infer<typeof priceStatusSchema>;
