import { z } from 'zod';

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(2, 'Nama kategori minimal 2 karakter.').max(100),
  description: z.string().trim().max(500).optional().nullable(),
});

export const categoryUpdateSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(500).optional().nullable(),
  is_active: z.boolean().optional(),
});

export const categoryStatusSchema = z.object({
  is_active: z.boolean(),
});

export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;
export type CategoryStatusInput = z.infer<typeof categoryStatusSchema>;
