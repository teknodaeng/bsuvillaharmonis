import PDFDocRaw from 'pdfkit/js/pdfkit.standalone.js';
import { config } from '../core/config.js';
import { AppError } from '../utils/response.js';
import { formatRupiah } from '../utils/currency.js';
import { formatDateTime, formatKg } from '../utils/formatting.js';
import { transactionService } from './transactionService.js';

// Standalone PDFKit with inlined standard AFM fonts for Cloudflare Workers & Node.js edge environments
const PDFDocument = ((PDFDocRaw as any)?.default || PDFDocRaw) as typeof import('pdfkit');

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
      officer_name: tx.officer_name || (currentUser?.role === 'ADMIN' ? (currentUser.name || currentUser.username) : 'Admin BSU'),
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
      items: (tx as any).items || [],
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
      try {
        const doc = new PDFDocument({
          size: 'A5',
          margin: 28,
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk: any) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (err: any) => reject(err));

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
        .text(`No. Transaksi: ${receipt.transaction_no}  |  Tanggal: ${receipt.transaction_date_formatted}  |  Petugas: ${receipt.officer_name || 'Petugas Loket'}`, {
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

      if (receipt.type === 'SETOR' && receipt.items && receipt.items.length > 0) {
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#374151');
        const startY = doc.y;
        doc.text('NO', 32, startY, { width: 20 });
        doc.text('JENIS / KELOMPOK SAMPAH', 55, startY, { width: 145 });
        doc.text('BERAT', 205, startY, { width: 50, align: 'right' });
        doc.text('TARIF', 260, startY, { width: 60, align: 'right' });
        doc.text('SUBTOTAL', 325, startY, { width: doc.page.width - 325 - 32, align: 'right' });
        doc.moveDown(0.3);

        doc.strokeColor('#d1d5db').lineWidth(0.5).moveTo(32, doc.y).lineTo(doc.page.width - 32, doc.y).stroke();
        doc.moveDown(0.3);

        receipt.items.forEach((it: any, idx: number) => {
          const rowY = doc.y;
          doc.fontSize(8).font('Helvetica');
          const nameText = it.display_name || it.category_name || '-';
          const nameHeight = doc.heightOfString(nameText, { width: 145 });
          const rowHeight = Math.max(nameHeight, 12);

          doc.fillColor('#4b5563');
          doc.text(String(idx + 1), 32, rowY, { width: 20 });
          doc.text(nameText, 55, rowY, { width: 145 });
          doc.text(formatKg(it.weight_gram), 205, rowY, { width: 50, align: 'right' });
          doc.text(formatRupiah(it.price_per_kg), 260, rowY, { width: 60, align: 'right' });
          doc.font('Helvetica-Bold').fillColor('#15803d');
          doc.text(formatRupiah(it.amount), 325, rowY, { width: doc.page.width - 325 - 32, align: 'right' });

          doc.y = rowY + rowHeight + 4;
        });

        doc.strokeColor('#d1d5db').lineWidth(0.5).moveTo(32, doc.y).lineTo(doc.page.width - 32, doc.y).stroke();
        doc.moveDown(0.3);

        const totalY = doc.y;
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#111827');
        doc.text('TOTAL:', 55, totalY, { width: 145 });
        doc.text(receipt.detail?.weight_formatted || '-', 205, totalY, { width: 50, align: 'right' });
        doc.text(receipt.detail?.amount_formatted || '-', 325, totalY, { width: doc.page.width - 325 - 32, align: 'right' });
        doc.moveDown(0.4);
      } else if (receipt.type === 'SETOR' && receipt.detail) {
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

      doc.y = boxY + 52;
      doc.moveDown(0.5);

      // Section: Tanda Tangan
      const sigY = doc.y;
      const colWidth = (doc.page.width - 56) / 2;

      doc.fontSize(8).font('Helvetica').fillColor('#374151');
      doc.text('Nasabah,', 28, sigY, { width: colWidth, align: 'center' });
      doc.text('Petugas Bank Sampah,', 28 + colWidth, sigY, { width: colWidth, align: 'center' });

      const sigLineY = sigY + 36;
      doc.strokeColor('#d1d5db').lineWidth(0.5);
      doc.moveTo(48, sigLineY).lineTo(48 + colWidth - 40, sigLineY).stroke();
      doc.moveTo(28 + colWidth + 20, sigLineY).lineTo(doc.page.width - 48, sigLineY).stroke();

      doc.fontSize(8).font('Helvetica-Bold').fillColor('#111827');
      doc.text(receipt.nasabah.name || '-', 28, sigLineY + 3, { width: colWidth, align: 'center' });
      doc.text(receipt.officer_name || 'Petugas Loket', 28 + colWidth, sigLineY + 3, { width: colWidth, align: 'center' });

      doc.y = sigLineY + 18;
      doc.moveDown(0.4);

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
      } catch (err) {
        reject(err);
      }
    });
  }
}

export const receiptService = ReceiptService;
