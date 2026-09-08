import { z } from 'zod';

export const transactionCreateSchema = z
  .object({
    nasabah_id: z.string().min(1, 'ID nasabah wajib diisi.'),
    transaction_date: z.string().optional().nullable(),
    type: z.enum(['SETOR', 'TARIK'], {
      errorMap: () => ({ message: 'Jenis transaksi harus SETOR atau TARIK.' }),
    }),
    price_id: z.string().optional().nullable(),
    category_id: z.string().optional().nullable(),
    weight_kg: z.number().positive('Berat sampah harus lebih dari 0 kg.').optional().nullable(),
    amount: z.number().int().positive('Nominal tarik tunai harus lebih dari 0.').optional().nullable(),
    notes: z.string().max(500).optional().nullable(),
    idempotency_key: z.string().max(100).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'SETOR') {
      if (!data.price_id && !data.category_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Kelompok sampah atau harga sampah wajib dipilih untuk transaksi SETOR.',
          path: ['price_id'],
        });
      }
      if (data.weight_kg === undefined || data.weight_kg === null || data.weight_kg <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Berat sampah (kg) wajib diisi dan lebih dari 0 untuk transaksi SETOR.',
          path: ['weight_kg'],
        });
      }
    } else if (data.type === 'TARIK') {
      if (data.amount === undefined || data.amount === null || data.amount <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Jumlah penarikan (amount) wajib diisi dan lebih dari 0 untuk transaksi TARIK.',
          path: ['amount'],
        });
      }
      if (data.category_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Transaksi TARIK tidak boleh menyertakan kategori sampah.',
          path: ['category_id'],
        });
      }
      if (data.price_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Transaksi TARIK tidak boleh menyertakan master harga sampah.',
          path: ['price_id'],
        });
      }
      if (data.weight_kg !== undefined && data.weight_kg !== null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Transaksi TARIK tidak boleh menyertakan berat sampah.',
          path: ['weight_kg'],
        });
      }
    }
  });

export type TransactionCreateInput = z.infer<typeof transactionCreateSchema>;
