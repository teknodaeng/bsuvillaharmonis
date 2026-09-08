import PDFDocument from 'pdfkit';
import { config } from '../core/config.js';
import { AppError } from '../utils/response.js';
import { formatRupiah } from '../utils/currency.js';
import { formatDateTime, formatKg } from '../utils/formatting.js';
import { transactionService } from './transactionService.js';

export class ReceiptService {
  public static async getReceiptData(transactionId: string, currentUser: any) {
    const tx = await transactionService.getTransactionById(transactionId);

    // Access control: If user is NASABAH, verify ownership
    if (currentUser.role === 'NASABAH') {
      if (currentUser.nasabah_id !== tx.nasabah_id) {
        throw new AppError(
          'Anda tidak memiliki izin untuk melihat bukti transaksi nasabah lain.',
          403,
          'FORBIDDEN'
        );
      }
    }

    const now = new Date();
    const nowStr = formatDateTime(now);

    let detailData = null;
    if (tx.type === 'SETOR') {
      detailData = {
        category_code: tx.category ? tx.category.price_code : null,
        category_name: tx.category ? tx.category.name : null,
        weight_kg: tx.weight_kg,
        weight_formatted: formatKg(tx.weight_gram),
        price_per_kg: tx.price_per_kg,
        price_formatted: `${formatRupiah(tx.price_per_kg)}/kg`,
        amount: tx.amount,
        amount_formatted: formatRupiah(tx.amount),
      };
    } else {
      detailData = {
        category_code: null,
        category_name: null,
        weight_kg: null,
        weight_formatted: null,
        price_per_kg: null,
        price_formatted: null,
        amount: tx.amount,
        amount_formatted: formatRupiah(tx.amount),
      };
    }

    return {
      app_name: config.BANK_NAME,
      title: 'BUKTI TRANSAKSI TABUNGAN BANK SAMPAH',
      transaction_no: tx.transaction_no,
      transaction_date: tx.transaction_date,
      transaction_date_formatted: formatDateTime(tx.transaction_date),
      type: tx.type,
      type_display: tx.type === 'SETOR' ? 'SETOR SAMPAH' : 'TARIK TUNAI',
      nasabah: {
        id: tx.nasabah_id,
        customer_id: tx.nasabah_customer_id,
        account_no: tx.nasabah_customer_id,
        name: tx.nasabah_name,
        nik: tx.nasabah_nik,
        phone: tx.nasabah_phone,
        address: tx.nasabah_address,
      },
      detail: detailData,
      mutation: {
        debit: tx.debit,
        debit_formatted: formatRupiah(tx.debit),
        credit: tx.credit,
        credit_formatted: formatRupiah(tx.credit),
        balance_after: tx.balance_after,
        balance_after_formatted: formatRupiah(tx.balance_after),
      },
      notes: tx.notes || '-',
      footer: config.RECEIPT_FOOTER,
      printed_at: nowStr,
    };
  }

  public static async generateReceiptPdf(
    transactionId: string,
    currentUser: any
  ): Promise<Buffer> {
    const receipt = await this.getReceiptData(transactionId, currentUser);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A5',
        margin: 28,
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      // Header
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .fillColor('#15803d')
        .text(receipt.app_name.toUpperCase(), { align: 'center' });

      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor('#1f2937')
        .text(receipt.title, { align: 'center' });

      doc.moveDown(0.3);
      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor('#6b7280')
        .text(`No. Transaksi: ${receipt.transaction_no}  |  Tanggal: ${receipt.transaction_date_formatted}`, {
          align: 'center',
        });

      doc.moveDown(0.5);
      doc
        .strokeColor('#e5e7eb')
        .lineWidth(1)
        .moveTo(28, doc.y)
        .lineTo(doc.page.width - 28, doc.y)
        .stroke();
      doc.moveDown(0.6);

      // Section: Data Nasabah
      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .fillColor('#111827')
        .text('DATA NASABAH');
      doc.moveDown(0.3);

      const drawRow = (label: string, value: string) => {
        const y = doc.y;
        doc
          .fontSize(8)
          .font('Helvetica')
          .fillColor('#4b5563')
          .text(label, 32, y, { width: 110 });
        doc
          .fontSize(8)
          .font('Helvetica-Bold')
          .fillColor('#1f2937')
          .text(`:  ${value || '-'}`, 145, y, {
            width: doc.page.width - 145 - 32,
          });
        doc.moveDown(0.25);
      };

      drawRow('ID Nasabah / Rek', receipt.nasabah.customer_id);
      drawRow('Nama Nasabah', receipt.nasabah.name);
      drawRow('No. KTP / NIK', receipt.nasabah.nik);
      if (receipt.nasabah.phone) drawRow('No. HP', receipt.nasabah.phone);
      if (receipt.nasabah.address) drawRow('Alamat', receipt.nasabah.address);

      doc.moveDown(0.5);
      doc
        .strokeColor('#e5e7eb')
        .lineWidth(1)
        .moveTo(28, doc.y)
        .lineTo(doc.page.width - 28, doc.y)
        .stroke();
      doc.moveDown(0.6);

      // Section: Detail Transaksi
      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .fillColor('#111827')
        .text(`DETAIL TRANSAKSI (${receipt.type_display})`);
      doc.moveDown(0.3);

      if (receipt.type === 'SETOR' && receipt.detail) {
        drawRow('Kelompok Sampah', receipt.detail.category_name || '-');
        drawRow('Berat Sampah', receipt.detail.weight_formatted || '-');
        drawRow('Harga Satuan', receipt.detail.price_formatted || '-');
        drawRow('Total Setoran', receipt.detail.amount_formatted || '-');
      } else {
        drawRow('Jenis Penarikan', 'Tarik Tunai Saldo');
        drawRow('Nominal Tarik', receipt.mutation.debit_formatted);
      }

      if (receipt.notes && receipt.notes !== '-') {
        drawRow('Catatan', receipt.notes);
      }

      doc.moveDown(0.5);
      doc
        .strokeColor('#e5e7eb')
        .lineWidth(1)
        .moveTo(28, doc.y)
        .lineTo(doc.page.width - 28, doc.y)
        .stroke();
      doc.moveDown(0.6);

      // Section: Mutasi Saldo Box
      const boxY = doc.y;
      doc
        .rect(28, boxY, doc.page.width - 56, 42)
        .fillAndStroke('#f0fdf4', '#86efac');

      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#166534')
        .text('Saldo Akhir Tabungan:', 40, boxY + 8);

      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .fillColor('#15803d')
        .text(receipt.mutation.balance_after_formatted, 40, boxY + 20);

      doc.y = boxY + 54;
      doc.moveDown(0.5);

      // Footer
      doc
        .fontSize(8)
        .font('Helvetica-Oblique')
        .fillColor('#6b7280')
        .text(receipt.footer, { align: 'center' });

      doc.moveDown(0.3);
      doc
        .fontSize(7)
        .font('Helvetica')
        .fillColor('#9ca3af')
        .text(`Dicetak pada: ${receipt.printed_at}`, { align: 'center' });

      doc.end();
    });
  }
}

export const receiptService = ReceiptService;
