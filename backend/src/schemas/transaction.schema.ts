import { z } from 'zod';

export const transactionItemSchema = z.object({
  price_id: z.string().min(1, 'Kelompok sampah wajib dipilih.'),
  category_id: z.string().optional().nullable(),
  weight_kg: z.number().positive('Berat sampah harus lebih dari 0 kg.'),
});

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
    items: z.array(transactionItemSchema).min(1, 'Minimal 1 jenis sampah harus disertakan.').optional().nullable(),
    amount: z.number().int().positive('Nominal tarik tunai harus lebih dari 0.').optional().nullable(),
    notes: z.string().max(500).optional().nullable(),
    idempotency_key: z.string().max(100).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'SETOR') {
      const hasItems = Array.isArray(data.items) && data.items.length > 0;
      if (hasItems) {
        // Items array provided, validate each item
        data.items!.forEach((it, idx) => {
          if (!it.price_id && !it.category_id) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Baris ke-${idx + 1}: Kelompok atau tarif sampah wajib dipilih.`,
              path: ['items', idx, 'price_id'],
            });
          }
          if (it.weight_kg === undefined || it.weight_kg === null || it.weight_kg <= 0) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Baris ke-${idx + 1}: Berat sampah (kg) wajib diisi dan lebih dari 0.`,
              path: ['items', idx, 'weight_kg'],
            });
          }
        });
      } else {
        // Fallback backward compatibility for single-item payload
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
      }
    } else if (data.type === 'TARIK') {
      if (data.items && data.items.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Transaksi TARIK tidak boleh menyertakan rincian sampah.',
          path: ['items'],
        });
      }
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

export type TransactionItemInput = z.infer<typeof transactionItemSchema>;
export type TransactionCreateInput = z.infer<typeof transactionCreateSchema>;

