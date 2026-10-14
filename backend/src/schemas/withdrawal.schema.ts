import { z } from 'zod';

export const withdrawalRequestCreateSchema = z
  .object({
    amount: z
      .number({
        required_error: 'Nominal penarikan wajib diisi.',
        invalid_type_error: 'Nominal penarikan harus berupa angka.',
      })
      .int('Nominal penarikan harus berupa bilangan bulat.')
      .min(1000, 'Nominal penarikan minimal Rp 1.000.'),
    method: z.enum(['TUNAI', 'TRANSFER'], {
      errorMap: () => ({ message: 'Metode penarikan harus TUNAI atau TRANSFER.' }),
    }).default('TUNAI'),
    bank_name: z.string().trim().max(100).optional().nullable(),
    account_number: z.string().trim().max(50).optional().nullable(),
    account_holder: z.string().trim().max(100).optional().nullable(),
    notes: z.string().trim().max(500).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.method === 'TRANSFER') {
      if (!data.bank_name || data.bank_name.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Nama bank tujuan transfer wajib diisi.',
          path: ['bank_name'],
        });
      }
      if (!data.account_number || data.account_number.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Nomor rekening tujuan transfer wajib diisi.',
          path: ['account_number'],
        });
      }
      if (!data.account_holder || data.account_holder.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Nama pemilik rekening tujuan transfer wajib diisi.',
          path: ['account_holder'],
        });
      }
    }
  });

export const withdrawalApproveSchema = z.object({
  notes: z.string().trim().max(500).optional().nullable(),
  transaction_date: z.string().trim().optional().nullable(),
});

export const withdrawalRejectSchema = z.object({
  rejection_reason: z
    .string({
      required_error: 'Alasan penolakan wajib diisi.',
      invalid_type_error: 'Alasan penolakan harus berupa teks.',
    })
    .trim()
    .min(3, 'Alasan penolakan wajib diisi (minimal 3 karakter).')
    .max(500, 'Alasan penolakan maksimal 500 karakter.'),
});

export type WithdrawalRequestCreateInput = z.infer<typeof withdrawalRequestCreateSchema>;
export type WithdrawalApproveInput = z.infer<typeof withdrawalApproveSchema>;
export type WithdrawalRejectInput = z.infer<typeof withdrawalRejectSchema>;
