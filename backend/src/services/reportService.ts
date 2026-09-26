import ExcelJS from 'exceljs';
import PDFDocRaw from 'pdfkit/js/pdfkit.standalone.js';
import { db } from '../core/database.js';
import { config } from '../core/config.js';
import { formatRupiah } from '../utils/currency.js';
import { formatDate, formatDateTime, formatKg } from '../utils/formatting.js';
import { sanitizeExcelRow } from '../utils/sanitizeExcel.js';
import { nasabahService } from './nasabahService.js';

// Standalone PDFKit with inlined standard AFM fonts for Cloudflare Workers & Node.js edge environments
const PDFDocument = ((PDFDocRaw as any)?.default || PDFDocRaw) as typeof import('pdfkit');

export class ReportService {
  // --- 1. Laporan Transaksi Tabungan ---
  public static async generateTransactionsExcel(params: {
    start_date?: string;
    end_date?: string;
    type?: string;
    category_id?: string;
    nasabah_id?: string;
  }): Promise<Buffer> {
    const { items } = await this.getTransactionsData(params);

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Laporan Transaksi');

    // Headers
    this.setupExcelHeader(
      ws,
      'LAPORAN TRANSAKSI TABUNGAN BANK SAMPAH',
      `Periode: ${params.start_date || 'Awal'} s/d ${params.end_date || 'Sekarang'}`,
      11
    );

    const headerRow = ws.addRow([
      'No',
      'No. Transaksi',
      'Tanggal',
      'ID Nasabah',
      'Nama Nasabah',
      'Jenis',
      'Kelompok Sampah',
      'Berat (kg)',
      'Tarif / kg',
      'Nilai Transaksi',
      'Saldo Akhir',
    ]);

    this.styleTableHeader(headerRow);

    let totalSetor = 0;
    let totalTarik = 0;
    let totalBeratGram = 0;

    items.forEach((item, idx) => {
      const isSetor = item.type === 'SETOR';
      if (isSetor) {
        totalSetor += item.credit || 0;
        totalBeratGram += item.weight_gram || 0;
      } else {
        totalTarik += item.debit || 0;
      }

      const row = ws.addRow(
        sanitizeExcelRow([
          idx + 1,
          item.transaction_no,
          formatDateTime(item.transaction_date),
          item.nasabah_customer_id,
          item.nasabah_name,
          item.type,
          item.category_name || '-',
          item.weight_kg ? Number(item.weight_kg.toFixed(3)) : '-',
          item.price_per_kg || '-',
          item.amount,
          item.balance_after,
        ])
      );
      row.alignment = { vertical: 'middle' };
    });

    // Summary Row
    const sumRow = ws.addRow([
      'TOTAL',
      '',
      '',
      '',
      '',
      '',
      '',
      Number((totalBeratGram / 1000).toFixed(3)),
      '',
      `Setor: ${formatRupiah(totalSetor)} | Tarik: ${formatRupiah(totalTarik)}`,
      '',
    ]);
    sumRow.font = { bold: true };
    sumRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF3F4F6' },
    };

    this.autoFitColumns(ws);
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  public static async generateTransactionsPdf(params: {
    start_date?: string;
    end_date?: string;
    type?: string;
    category_id?: string;
    nasabah_id?: string;
  }): Promise<Buffer> {
    const { items } = await this.getTransactionsData(params);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 28,
      });

      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (e) => reject(e));

      // Header
      this.drawPdfReportHeader(
        doc,
        'LAPORAN TRANSAKSI TABUNGAN BANK SAMPAH',
        `Periode: ${params.start_date || 'Awal'} s/d ${params.end_date || 'Sekarang'}`
      );

      // Table columns layout (Landscape A4 width = 841.89, margin 28 each side -> printable = ~785)
      const cols = [
        { label: 'No', width: 25, align: 'center' },
        { label: 'No. TRX', width: 105, align: 'left' },
        { label: 'Tanggal', width: 75, align: 'center' },
        { label: 'ID Nasabah', width: 65, align: 'left' },
        { label: 'Nama Nasabah', width: 110, align: 'left' },
        { label: 'Jenis', width: 50, align: 'center' },
        { label: 'Kelompok Sampah', width: 115, align: 'left' },
        { label: 'Berat', width: 55, align: 'right' },
        { label: 'Tarif/kg', width: 60, align: 'right' },
        { label: 'Jumlah (Rp)', width: 65, align: 'right' },
        { label: 'Saldo (Rp)', width: 60, align: 'right' },
      ];

      let y = doc.y + 10;
      this.drawPdfTableHeader(doc, y, cols);
      y += 18;

      let totalSetor = 0;
      let totalTarik = 0;

      items.forEach((item, idx) => {
        if (y > doc.page.height - 40) {
          doc.addPage({ size: 'A4', layout: 'landscape', margin: 28 });
          y = 30;
          this.drawPdfTableHeader(doc, y, cols);
          y += 18;
        }

        if (item.type === 'SETOR') totalSetor += item.credit;
        else totalTarik += item.debit;

        let x = 28;
        doc.fontSize(7).font('Helvetica').fillColor('#1f2937');

        const rowValues = [
          String(idx + 1),
          item.transaction_no,
          formatDateTime(item.transaction_date),
          item.nasabah_customer_id,
          item.nasabah_name,
          item.type,
          item.category_name || '-',
          item.weight_gram ? formatKg(item.weight_gram) : '-',
          item.price_per_kg ? formatRupiah(item.price_per_kg) : '-',
          formatRupiah(item.amount),
          formatRupiah(item.balance_after),
        ];

        rowValues.forEach((val, cIdx) => {
          doc.text(val, x + 2, y + 2, {
            width: cols[cIdx].width - 4,
            align: cols[cIdx].align as any,
            lineBreak: false,
          });
          x += cols[cIdx].width;
        });

        // Row bottom border
        doc.strokeColor('#f3f4f6').lineWidth(0.5).moveTo(28, y + 14).lineTo(doc.page.width - 28, y + 14).stroke();
        y += 15;
      });

      // Totals
      doc.moveDown(0.5);
      doc
        .fontSize(8)
        .font('Helvetica-Bold')
        .fillColor('#15803d')
        .text(
          `Rekapitulasi: Total Setor = ${formatRupiah(totalSetor)}  |  Total Tarik = ${formatRupiah(totalTarik)}  |  Total Transaksi = ${items.length}`,
          28,
          y + 10
        );

      doc.end();
    });
  }

  // --- 2. Rekapitulasi per Kelompok Sampah ---
  public static async generateCategoryRecapExcel(params: {
    start_date?: string;
    end_date?: string;
  }): Promise<Buffer> {
    const items = await this.getCategoryRecapData(params);

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Rekapitulasi Sampah');

    this.setupExcelHeader(
      ws,
      'REKAPITULASI SETORAN PER KELOMPOK SAMPAH',
      `Periode: ${params.start_date || 'Awal'} s/d ${params.end_date || 'Sekarang'}`,
      6
    );

    const headerRow = ws.addRow([
      'No',
      'Kelompok / Jenis Sampah',
      'Kode',
      'Total Berat (kg)',
      'Total Nilai Setor',
      'Jumlah Transaksi',
    ]);
    this.styleTableHeader(headerRow);

    let sumKg = 0;
    let sumRp = 0;
    let sumTrx = 0;

    items.forEach((item, idx) => {
      sumKg += item.total_weight_kg;
      sumRp += item.total_amount;
      sumTrx += item.transaction_count;

      ws.addRow(
        sanitizeExcelRow([
          idx + 1,
          item.category_name,
          item.price_code || '-',
          item.total_weight_kg,
          item.total_amount,
          item.transaction_count,
        ])
      );
    });

    const sumRow = ws.addRow(['TOTAL', '', '', sumKg, sumRp, sumTrx]);
    sumRow.font = { bold: true };
    sumRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF3F4F6' },
    };

    this.autoFitColumns(ws);
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  public static async generateCategoryRecapPdf(params: {
    start_date?: string;
    end_date?: string;
  }): Promise<Buffer> {
    const items = await this.getCategoryRecapData(params);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', layout: 'portrait', margin: 28 });
      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (e) => reject(e));

      this.drawPdfReportHeader(
        doc,
        'REKAPITULASI SETORAN PER KELOMPOK SAMPAH',
        `Periode: ${params.start_date || 'Awal'} s/d ${params.end_date || 'Sekarang'}`
      );

      const cols = [
        { label: 'No', width: 30, align: 'center' },
        { label: 'Kelompok / Kategori Sampah', width: 210, align: 'left' },
        { label: 'Kode', width: 65, align: 'center' },
        { label: 'Total Berat', width: 85, align: 'right' },
        { label: 'Total Setoran (Rp)', width: 95, align: 'right' },
        { label: 'Jml TRX', width: 55, align: 'center' },
      ];

      let y = doc.y + 10;
      this.drawPdfTableHeader(doc, y, cols);
      y += 18;

      let sumKg = 0;
      let sumRp = 0;
      let sumTrx = 0;

      items.forEach((item, idx) => {
        if (y > doc.page.height - 40) {
          doc.addPage({ size: 'A4', layout: 'portrait', margin: 28 });
          y = 30;
          this.drawPdfTableHeader(doc, y, cols);
          y += 18;
        }

        sumKg += item.total_weight_kg;
        sumRp += item.total_amount;
        sumTrx += item.transaction_count;

        let x = 28;
        doc.fontSize(8).font('Helvetica').fillColor('#1f2937');

        const rowValues = [
          String(idx + 1),
          item.category_name,
          item.price_code || '-',
          `${item.total_weight_kg.toFixed(3)} kg`,
          formatRupiah(item.total_amount),
          String(item.transaction_count),
        ];

        rowValues.forEach((val, cIdx) => {
          doc.text(val, x + 2, y + 2, {
            width: cols[cIdx].width - 4,
            align: cols[cIdx].align as any,
          });
          x += cols[cIdx].width;
        });

        doc.strokeColor('#f3f4f6').lineWidth(0.5).moveTo(28, y + 16).lineTo(doc.page.width - 28, y + 16).stroke();
        y += 18;
      });

      doc.moveDown(0.5);
      doc
        .fontSize(8)
        .font('Helvetica-Bold')
        .fillColor('#15803d')
        .text(
          `Total Keseluruhan: Volume = ${sumKg.toFixed(3)} kg  |  Nilai Rupiah = ${formatRupiah(sumRp)}  |  Transaksi = ${sumTrx}`,
          28,
          y + 10
        );

      doc.end();
    });
  }

  // --- 3. Laporan Nasabah & Saldo ---
  public static async generateNasabahExcel(): Promise<Buffer> {
    const items = await this.getNasabahReportData();

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Daftar Nasabah & Saldo');

    this.setupExcelHeader(
      ws,
      'DAFTAR NASABAH & SALDO TABUNGAN',
      `Tanggal Unduh: ${formatDate(new Date())}`,
      10
    );

    const headerRow = ws.addRow([
      'No',
      'ID Nasabah',
      'No. Rekening',
      'NIK',
      'Nama Nasabah',
      'Kategori',
      'No. HP',
      'Alamat Domisili',
      'Status',
      'Saldo Tabungan',
    ]);
    this.styleTableHeader(headerRow);

    let totalSaldo = 0;

    items.forEach((item, idx) => {
      totalSaldo += item.balance;
      ws.addRow(
        sanitizeExcelRow([
          idx + 1,
          item.customer_id,
          item.account_no,
          item.nik,
          item.name,
          item.nasabah_category,
          item.phone,
          item.address,
          item.status,
          item.balance,
        ])
      );
    });

    const sumRow = ws.addRow([
      'TOTAL KEWAJIBAN SIMPANAN',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      totalSaldo,
    ]);
    sumRow.font = { bold: true };
    sumRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF3F4F6' },
    };

    this.autoFitColumns(ws);
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  public static async generateNasabahPdf(): Promise<Buffer> {
    const items = await this.getNasabahReportData();

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', layout: 'portrait', margin: 28 });
      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (e) => reject(e));

      this.drawPdfReportHeader(
        doc,
        'DAFTAR NASABAH & SALDO TABUNGAN',
        `Tanggal Unduh: ${formatDate(new Date())}`
      );

      const cols = [
        { label: 'No', width: 25, align: 'center' },
        { label: 'ID Nasabah', width: 60, align: 'left' },
        { label: 'NIK', width: 90, align: 'left' },
        { label: 'Nama Nasabah', width: 110, align: 'left' },
        { label: 'No. HP', width: 75, align: 'left' },
        { label: 'Kategori', width: 75, align: 'left' },
        { label: 'Status', width: 45, align: 'center' },
        { label: 'Saldo (Rp)', width: 60, align: 'right' },
      ];

      let y = doc.y + 10;
      this.drawPdfTableHeader(doc, y, cols);
      y += 18;

      let totalSaldo = 0;

      items.forEach((item, idx) => {
        if (y > doc.page.height - 40) {
          doc.addPage({ size: 'A4', layout: 'portrait', margin: 28 });
          y = 30;
          this.drawPdfTableHeader(doc, y, cols);
          y += 18;
        }

        totalSaldo += item.balance;

        let x = 28;
        doc.fontSize(7.5).font('Helvetica').fillColor('#1f2937');

        const rowValues = [
          String(idx + 1),
          item.customer_id,
          item.nik,
          item.name,
          item.phone,
          item.nasabah_category,
          item.status,
          formatRupiah(item.balance),
        ];

        rowValues.forEach((val, cIdx) => {
          doc.text(val, x + 2, y + 2, {
            width: cols[cIdx].width - 4,
            align: cols[cIdx].align as any,
          });
          x += cols[cIdx].width;
        });

        doc.strokeColor('#f3f4f6').lineWidth(0.5).moveTo(28, y + 15).lineTo(doc.page.width - 28, y + 15).stroke();
        y += 16;
      });

      doc.moveDown(0.5);
      doc
        .fontSize(8)
        .font('Helvetica-Bold')
        .fillColor('#15803d')
        .text(
          `Total Nasabah: ${items.length} orang  |  Total Kewajiban Saldo: ${formatRupiah(totalSaldo)}`,
          28,
          y + 10
        );

      doc.end();
    });
  }

  // --- 4. Laporan Master Harga Sampah ---
  public static async generatePricesExcel(): Promise<Buffer> {
    const items = await this.getPricesReportData();

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Master Harga Sampah');

    this.setupExcelHeader(
      ws,
      'MASTER HARGA SAMPAH TERKINI',
      `Tanggal Cetak: ${formatDate(new Date())}`,
      8
    );

    const headerRow = ws.addRow([
      'No',
      'Kategori Sampah',
      'Kelompok Sampah',
      'Kode Harga',
      'Contoh Barang',
      'Tarif / kg',
      'Tanggal Efektif',
      'Status',
    ]);
    this.styleTableHeader(headerRow);

    items.forEach((item, idx) => {
      ws.addRow(
        sanitizeExcelRow([
          idx + 1,
          item.category_name,
          item.group_name || '-',
          item.price_code || '-',
          item.example_items || '-',
          item.price_per_kg,
          formatDate(item.effective_date),
          item.status,
        ])
      );
    });

    this.autoFitColumns(ws);
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  public static async generatePricesPdf(): Promise<Buffer> {
    const items = await this.getPricesReportData();

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', layout: 'portrait', margin: 28 });
      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (e) => reject(e));

      this.drawPdfReportHeader(
        doc,
        'MASTER HARGA SAMPAH TERKINI',
        `Tanggal Cetak: ${formatDate(new Date())}`
      );

      const cols = [
        { label: 'No', width: 25, align: 'center' },
        { label: 'Kategori', width: 100, align: 'left' },
        { label: 'Kelompok Sampah', width: 95, align: 'left' },
        { label: 'Kode', width: 55, align: 'center' },
        { label: 'Contoh Barang', width: 125, align: 'left' },
        { label: 'Tarif/kg', width: 60, align: 'right' },
        { label: 'Tgl Efektif', width: 45, align: 'center' },
        { label: 'Status', width: 40, align: 'center' },
      ];

      let y = doc.y + 10;
      this.drawPdfTableHeader(doc, y, cols);
      y += 18;

      items.forEach((item, idx) => {
        if (y > doc.page.height - 40) {
          doc.addPage({ size: 'A4', layout: 'portrait', margin: 28 });
          y = 30;
          this.drawPdfTableHeader(doc, y, cols);
          y += 18;
        }

        let x = 28;
        doc.fontSize(7.5).font('Helvetica').fillColor('#1f2937');

        const rowValues = [
          String(idx + 1),
          item.category_name,
          item.group_name || '-',
          item.price_code || '-',
          item.example_items || '-',
          formatRupiah(item.price_per_kg),
          formatDate(item.effective_date),
          item.status,
        ];

        rowValues.forEach((val, cIdx) => {
          doc.text(val, x + 2, y + 2, {
            width: cols[cIdx].width - 4,
            align: cols[cIdx].align as any,
          });
          x += cols[cIdx].width;
        });

        doc.strokeColor('#f3f4f6').lineWidth(0.5).moveTo(28, y + 16).lineTo(doc.page.width - 28, y + 16).stroke();
        y += 17;
      });

      doc.end();
    });
  }

  // --- 5. Laporan Riwayat Transaksi Setiap Nasabah Aktif ---
  public static async generateActiveNasabahTransactionsExcel(params: {
    nasabah_id?: string;
    start_date?: string;
    end_date?: string;
    type?: string;
  }): Promise<Buffer> {
    const { nasabah_list, summary } = await this.getActiveNasabahTransactionsData(params);

    const workbook = new ExcelJS.Workbook();

    // Sheet 1: Riwayat Transaksi Per Nasabah Aktif
    const ws1 = workbook.addWorksheet('Riwayat Nasabah Aktif');

    const singleNasabah =
      params.nasabah_id && nasabah_list.length === 1 ? nasabah_list[0] : null;
    const titleText = singleNasabah
      ? `LAPORAN RIWAYAT TRANSAKSI NASABAH: ${singleNasabah.name.toUpperCase()} (${singleNasabah.customer_id})`
      : 'LAPORAN RIWAYAT TRANSAKSI SETIAP NASABAH AKTIF';

    const subTitle = `Periode: ${params.start_date || 'Awal'} s/d ${params.end_date || 'Sekarang'} | Filter Mutasi: ${params.type || 'Semua (Setor & Tarik)'} | Tanggal Unduh: ${formatDate(new Date())}`;

    this.setupExcelHeader(ws1, titleText, subTitle, 10);

    for (const n of nasabah_list) {
      // Banner 1: Identitas Nasabah
      const bannerRow1 = ws1.addRow([
        `NASABAH: [${n.customer_id}] ${n.name.toUpperCase()}   |   No. Rek: ${n.account_no}   |   Kategori: ${n.nasabah_category}`,
        '', '', '', '', '', '', '', '', '',
      ]);
      ws1.mergeCells(bannerRow1.number, 1, bannerRow1.number, 10);
      bannerRow1.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      bannerRow1.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF15803D' },
      };
      bannerRow1.alignment = { horizontal: 'left', vertical: 'middle' };

      // Banner 2: Detail Kontak & Saldo
      const addressParts = [
        n.address,
        n.rt ? `RT ${n.rt}` : '',
        n.rw ? `RW ${n.rw}` : '',
        n.kelurahan,
        n.kecamatan,
      ].filter(Boolean);
      const addressStr = addressParts.length > 0 ? addressParts.join(', ') : '-';

      const bannerRow2 = ws1.addRow([
        `NIK: ${n.nik || '-'}   |   No. HP: ${n.phone || '-'}   |   Alamat: ${addressStr}   |   Posisi Saldo Tabungan: ${formatRupiah(n.current_balance)}`,
        '', '', '', '', '', '', '', '', '',
      ]);
      ws1.mergeCells(bannerRow2.number, 1, bannerRow2.number, 10);
      bannerRow2.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF14532D' } };
      bannerRow2.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFDCFCE7' },
      };
      bannerRow2.alignment = { horizontal: 'left', vertical: 'middle' };

      // Table Header Row for this Nasabah
      const thRow = ws1.addRow([
        'No',
        'No. Transaksi',
        'Tanggal & Jam',
        'Jenis Mutasi',
        'Kategori / Sampah',
        'Berat (kg)',
        'Tarif / kg',
        'Setoran (Kredit)',
        'Penarikan (Debit)',
        'Saldo Berjalan',
      ]);
      thRow.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF1F2937' } };
      thRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE5E7EB' },
      };
      thRow.alignment = { horizontal: 'center', vertical: 'middle' };

      if (n.transactions.length === 0) {
        const emptyRow = ws1.addRow([
          '-',
          '-',
          '-',
          '-',
          'Belum ada catatan mutasi transaksi pada periode ini',
          '-',
          '-',
          0,
          0,
          n.current_balance,
        ]);
        emptyRow.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF6B7280' } };
      } else {
        n.transactions.forEach((tx: any, idx: number) => {
          const r = ws1.addRow(
            sanitizeExcelRow([
              idx + 1,
              tx.transaction_no,
              formatDateTime(tx.transaction_date),
              tx.type,
              tx.category_display || '-',
              tx.weight_kg ? Number(tx.weight_kg.toFixed(3)) : '-',
              tx.price_per_kg || '-',
              tx.credit || 0,
              tx.debit || 0,
              tx.balance_after,
            ])
          );
          r.font = { name: 'Arial', size: 9 };
          r.alignment = { vertical: 'middle' };
        });
      }

      // Subtotal row for this nasabah
      const subtotalRow = ws1.addRow([
        `SUBTOTAL ${n.name}`,
        '',
        '',
        `${n.transactions.length} Transaksi`,
        '',
        n.total_weight_kg > 0 ? Number(n.total_weight_kg.toFixed(3)) : '-',
        '',
        n.total_setor,
        n.total_tarik,
        n.current_balance,
      ]);
      subtotalRow.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF1F2937' } };
      subtotalRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF3F4F6' },
      };

      ws1.addRow([]); // Blank line separator
    }

    // Grand Total Row if multiple nasabah
    if (nasabah_list.length > 1) {
      const grandRow = ws1.addRow([
        'GRAND TOTAL KESELURUHAN',
        '',
        '',
        `${summary.grand_total_transactions} Trx (${nasabah_list.length} Nasabah Aktif)`,
        '',
        summary.grand_total_weight_kg,
        '',
        summary.grand_total_setor,
        summary.grand_total_tarik,
        summary.grand_total_balance,
      ]);
      grandRow.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      grandRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF15803D' },
      };
    }

    this.autoFitColumns(ws1);

    // Sheet 2: Rekap Ringkasan Nasabah Aktif
    const ws2 = workbook.addWorksheet('Rekapitulasi Nasabah');
    this.setupExcelHeader(
      ws2,
      'REKAPITULASI STATUS & AKTIVITAS NASABAH AKTIF',
      `Total ${nasabah_list.length} Nasabah Aktif Terdaftar | Tanggal: ${formatDate(new Date())}`,
      12
    );

    const rekapHeader = ws2.addRow([
      'No',
      'ID Nasabah',
      'No. Rekening',
      'NIK',
      'Nama Lengkap',
      'Kategori',
      'No. HP',
      'Jml Trx',
      'Total Sampah (kg)',
      'Total Setoran (Rp)',
      'Total Penarikan (Rp)',
      'Saldo Tabungan (Rp)',
    ]);
    this.styleTableHeader(rekapHeader);

    nasabah_list.forEach((n, idx) => {
      ws2.addRow(
        sanitizeExcelRow([
          idx + 1,
          n.customer_id,
          n.account_no,
          n.nik,
          n.name,
          n.nasabah_category,
          n.phone,
          n.transaction_count,
          n.total_weight_kg,
          n.total_setor,
          n.total_tarik,
          n.current_balance,
        ])
      );
    });

    const sumRekap = ws2.addRow([
      'TOTAL',
      '',
      '',
      '',
      `${nasabah_list.length} Nasabah Aktif`,
      '',
      '',
      summary.grand_total_transactions,
      summary.grand_total_weight_kg,
      summary.grand_total_setor,
      summary.grand_total_tarik,
      summary.grand_total_balance,
    ]);
    sumRekap.font = { bold: true };
    sumRekap.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF3F4F6' },
    };

    this.autoFitColumns(ws2);

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  public static async generateActiveNasabahTransactionsPdf(params: {
    nasabah_id?: string;
    start_date?: string;
    end_date?: string;
    type?: string;
  }): Promise<Buffer> {
    const { nasabah_list, summary } = await this.getActiveNasabahTransactionsData(params);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 28,
      });

      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (e) => reject(e));

      const singleNasabah =
        params.nasabah_id && nasabah_list.length === 1 ? nasabah_list[0] : null;
      const titleText = singleNasabah
        ? `LAPORAN RIWAYAT TRANSAKSI NASABAH: ${singleNasabah.name.toUpperCase()} (${singleNasabah.customer_id})`
        : 'LAPORAN RIWAYAT TRANSAKSI SETIAP NASABAH AKTIF';

      const subTitle = `Periode: ${params.start_date || 'Awal'} s/d ${params.end_date || 'Sekarang'} | Filter Mutasi: ${params.type || 'Semua'} | Dicetak: ${formatDateTime(new Date())}`;

      this.drawPdfReportHeader(doc, titleText, subTitle);

      const cols = [
        { label: 'No', width: 25, align: 'center' },
        { label: 'No. TRX', width: 95, align: 'left' },
        { label: 'Tanggal', width: 75, align: 'center' },
        { label: 'Jenis', width: 45, align: 'center' },
        { label: 'Kategori / Sampah', width: 140, align: 'left' },
        { label: 'Berat', width: 55, align: 'right' },
        { label: 'Tarif/kg', width: 65, align: 'right' },
        { label: 'Setor (Rp)', width: 75, align: 'right' },
        { label: 'Tarik (Rp)', width: 75, align: 'right' },
        { label: 'Saldo (Rp)', width: 75, align: 'right' },
      ];
      const tableWidth = cols.reduce((a, b) => a + b.width, 0);

      let y = doc.y + 6;

      nasabah_list.forEach((n) => {
        // New page check for nasabah card
        if (y > doc.page.height - 110) {
          doc.addPage({ size: 'A4', layout: 'landscape', margin: 28 });
          y = 28;
        }

        // Draw Nasabah Header Card Box
        doc.rect(28, y, tableWidth, 26).fillAndStroke('#F0FDF4', '#86EFAC');

        // Text inside Nasabah Box
        doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#15803D');
        doc.text(
          `[${n.customer_id}] ${n.name.toUpperCase()} (Rek: ${n.account_no}) — Kategori: ${n.nasabah_category}`,
          34,
          y + 4,
          { width: tableWidth - 12 }
        );

        doc.fontSize(7).font('Helvetica').fillColor('#374151');
        const addrParts = [
          n.address,
          n.rt ? `RT ${n.rt}` : '',
          n.rw ? `RW ${n.rw}` : '',
          n.kelurahan,
          n.kecamatan,
        ].filter(Boolean);
        const addr = addrParts.length > 0 ? addrParts.join(', ') : '-';

        doc.text(
          `NIK: ${n.nik || '-'}  |  HP: ${n.phone || '-'}  |  Alamat: ${addr}  |  Saldo Saat Ini: ${formatRupiah(n.current_balance)}`,
          34,
          y + 15,
          { width: tableWidth - 12 }
        );

        y += 30;

        // Table Header
        this.drawPdfTableHeader(doc, y, cols);
        y += 18;

        if (n.transactions.length === 0) {
          doc.fontSize(7.5).font('Helvetica-Oblique').fillColor('#6b7280');
          doc.text('Belum ada riwayat transaksi pada rentang filter ini.', 34, y + 3, {
            width: tableWidth - 12,
          });
          doc.strokeColor('#e5e7eb').lineWidth(0.5).moveTo(28, y + 14).lineTo(28 + tableWidth, y + 14).stroke();
          y += 16;
        } else {
          n.transactions.forEach((tx: any, idx: number) => {
            if (y > doc.page.height - 35) {
              doc.addPage({ size: 'A4', layout: 'landscape', margin: 28 });
              y = 28;
              this.drawPdfTableHeader(doc, y, cols);
              y += 18;
            }

            let x = 28;
            doc.fontSize(7).font('Helvetica').fillColor('#1f2937');

            const rowValues = [
              String(idx + 1),
              tx.transaction_no,
              formatDateTime(tx.transaction_date),
              tx.type,
              tx.category_display || '-',
              tx.weight_kg ? `${tx.weight_kg.toFixed(3)} kg` : '-',
              tx.price_per_kg ? formatRupiah(tx.price_per_kg) : '-',
              tx.credit > 0 ? formatRupiah(tx.credit) : '-',
              tx.debit > 0 ? formatRupiah(tx.debit) : '-',
              formatRupiah(tx.balance_after),
            ];

            rowValues.forEach((val, cIdx) => {
              doc.text(val, x + 2, y + 2, {
                width: cols[cIdx].width - 4,
                align: cols[cIdx].align as any,
                lineBreak: false,
              });
              x += cols[cIdx].width;
            });

            doc.strokeColor('#f3f4f6').lineWidth(0.5).moveTo(28, y + 13).lineTo(28 + tableWidth, y + 13).stroke();
            y += 14;
          });
        }

        // Subtotal row for this nasabah
        doc.rect(28, y, tableWidth, 14).fill('#F9FAFB');
        doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#15803D');
        doc.text(
          `Subtotal ${n.name}: Setor = ${formatRupiah(n.total_setor)}  |  Tarik = ${formatRupiah(n.total_tarik)}  |  Volume Sampah = ${n.total_weight_kg.toFixed(3)} kg  |  Transaksi = ${n.transactions.length}`,
          34,
          y + 3,
          { width: tableWidth - 12 }
        );
        doc.strokeColor('#d1d5db').lineWidth(0.5).moveTo(28, y + 14).lineTo(28 + tableWidth, y + 14).stroke();
        y += 20;
      });

      // Grand Total Summary if more than 1 nasabah
      if (nasabah_list.length > 1) {
        if (y > doc.page.height - 45) {
          doc.addPage({ size: 'A4', layout: 'landscape', margin: 28 });
          y = 28;
        }

        doc.rect(28, y, tableWidth, 22).fillAndStroke('#15803D', '#166534');
        doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#FFFFFF');
        doc.text(
          `TOTAL KESELURUHAN ${nasabah_list.length} NASABAH AKTIF:`,
          34,
          y + 3,
          { width: tableWidth - 12 }
        );
        doc.fontSize(7.5).font('Helvetica').fillColor('#DCFCE7');
        doc.text(
          `Total Transaksi = ${summary.grand_total_transactions}  |  Total Sampah = ${summary.grand_total_weight_kg.toFixed(3)} kg  |  Total Setor = ${formatRupiah(summary.grand_total_setor)}  |  Total Tarik = ${formatRupiah(summary.grand_total_tarik)}  |  Total Saldo Kewajiban = ${formatRupiah(summary.grand_total_balance)}`,
          34,
          y + 12,
          { width: tableWidth - 12 }
        );
      }

      doc.end();
    });
  }

  // --- Internal Data Fetchers ---
  private static async getActiveNasabahTransactionsData(params: {
    nasabah_id?: string;
    start_date?: string;
    end_date?: string;
    type?: string;
  }) {
    const nasabahArgs: any[] = [];
    let nasabahWhere = "status = 'ACTIVE'";

    if (params.nasabah_id) {
      nasabahWhere += ' AND (id = ? OR customer_id = ? OR account_no = ?)';
      nasabahArgs.push(params.nasabah_id, params.nasabah_id, params.nasabah_id);
    }

    const nasabahRows = await db.fetchAll<any>(
      `SELECT 
         id,
         customer_id,
         account_no,
         CAST(nik AS TEXT) as nik,
         name,
         CAST(phone AS TEXT) as phone,
         address,
         rt,
         rw,
         kelurahan,
         kecamatan,
         kabupaten_kota,
         nasabah_category,
         email,
         status,
         created_at
       FROM nasabah
       WHERE ${nasabahWhere}
       ORDER BY customer_id ASC`,
      nasabahArgs
    );

    let grandTotalSetor = 0;
    let grandTotalTarik = 0;
    let grandTotalWeightGram = 0;
    let grandTotalBalance = 0;
    let grandTotalTransactions = 0;

    const nasabahList = await Promise.all(
      nasabahRows.map(async (n) => {
        const txConditions: string[] = ['t.nasabah_id = ?'];
        const txArgs: any[] = [n.id];

        if (params.start_date) {
          txConditions.push('date(t.transaction_date) >= date(?)');
          txArgs.push(params.start_date);
        }
        if (params.end_date) {
          txConditions.push('date(t.transaction_date) <= date(?)');
          txArgs.push(params.end_date);
        }
        if (params.type) {
          txConditions.push('t.type = ?');
          txArgs.push(params.type);
        }

        const txRows = await db.fetchAll<any>(
          `SELECT t.*,
                  c.name as category_name,
                  p.group_name as price_group_name,
                  p.price_code as price_code
           FROM transactions t
           LEFT JOIN waste_categories c ON t.category_id = c.id
           LEFT JOIN waste_price_masters p ON t.price_id = p.id
           WHERE ${txConditions.join(' AND ')}
           ORDER BY t.transaction_date ASC, t.created_at ASC`,
          txArgs
        );

        let totalSetor = 0;
        let totalTarik = 0;
        let totalWeightGram = 0;

        const transactions = await Promise.all(
          txRows.map(async (tx) => {
            const isSetor = tx.type === 'SETOR';
            if (isSetor) {
              totalSetor += tx.credit || tx.amount || 0;
              totalWeightGram += tx.weight_gram || 0;
            } else {
              totalTarik += tx.debit || tx.amount || 0;
            }

            // Resolve category / item display
            let categoryDisplay = tx.category_name || '-';
            if (isSetor) {
              const items = await db.fetchAll<any>(
                `SELECT ti.*, c.name as category_name
                 FROM transaction_items ti
                 JOIN waste_categories c ON ti.category_id = c.id
                 WHERE ti.transaction_id = ?`,
                [tx.id]
              );
              if (items.length > 1) {
                categoryDisplay = items.map((it) => it.category_name).join(', ');
              } else if (items.length === 1 && !tx.category_name) {
                categoryDisplay = items[0].category_name;
              }
            }

            return {
              ...tx,
              category_display: categoryDisplay,
              weight_kg: tx.weight_gram ? tx.weight_gram / 1000.0 : null,
              credit: tx.credit || (isSetor ? tx.amount : 0),
              debit: tx.debit || (!isSetor ? tx.amount : 0),
            };
          })
        );

        const currentBalance = await nasabahService.getNasabahBalance(n.id);

        grandTotalSetor += totalSetor;
        grandTotalTarik += totalTarik;
        grandTotalWeightGram += totalWeightGram;
        grandTotalBalance += currentBalance;
        grandTotalTransactions += transactions.length;

        return {
          ...n,
          current_balance: currentBalance,
          total_setor: totalSetor,
          total_tarik: totalTarik,
          total_weight_kg: Number((totalWeightGram / 1000.0).toFixed(3)),
          total_weight_gram: totalWeightGram,
          transaction_count: transactions.length,
          transactions,
        };
      })
    );

    return {
      nasabah_list: nasabahList,
      summary: {
        total_nasabah: nasabahList.length,
        grand_total_setor: grandTotalSetor,
        grand_total_tarik: grandTotalTarik,
        grand_total_weight_kg: Number((grandTotalWeightGram / 1000.0).toFixed(3)),
        grand_total_balance: grandTotalBalance,
        grand_total_transactions: grandTotalTransactions,
      },
    };
  }
  private static async getTransactionsData(params: any) {
    const conditions: string[] = ['1=1'];
    const args: any[] = [];

    if (params.nasabah_id) {
      conditions.push('t.nasabah_id = ?');
      args.push(params.nasabah_id);
    }
    if (params.start_date) {
      conditions.push('date(t.transaction_date) >= date(?)');
      args.push(params.start_date);
    }
    if (params.end_date) {
      conditions.push('date(t.transaction_date) <= date(?)');
      args.push(params.end_date);
    }
    if (params.type) {
      conditions.push('t.type = ?');
      args.push(params.type);
    }
    if (params.category_id) {
      conditions.push('t.category_id = ?');
      args.push(params.category_id);
    }

    const whereClause = conditions.join(' AND ');
    const rows = await db.fetchAll<any>(
      `SELECT t.*, 
              n.customer_id as nasabah_customer_id, 
              n.name as nasabah_name, 
              c.name as category_name,
              p.group_name as price_group_name
       FROM transactions t
       JOIN nasabah n ON t.nasabah_id = n.id
       LEFT JOIN waste_categories c ON t.category_id = c.id
       LEFT JOIN waste_price_masters p ON t.price_id = p.id
       WHERE ${whereClause}
       ORDER BY t.transaction_date ASC, t.created_at ASC`,
      args
    );

    const items = rows.map((r) => ({
      ...r,
      weight_kg: r.weight_gram ? r.weight_gram / 1000.0 : null,
    }));

    return { items };
  }

  private static async getCategoryRecapData(params: any) {
    const conditions: string[] = ["t.type = 'SETOR'"];
    const args: any[] = [];

    if (params.start_date) {
      conditions.push('date(t.transaction_date) >= date(?)');
      args.push(params.start_date);
    }
    if (params.end_date) {
      conditions.push('date(t.transaction_date) <= date(?)');
      args.push(params.end_date);
    }

    const whereClause = conditions.join(' AND ');
    const rows = await db.fetchAll<any>(
      `SELECT c.id as category_id,
              c.name as category_name,
              p.group_name as price_group_name,
              p.price_code as price_code,
              SUM(ti.weight_gram) as total_weight_gram,
              SUM(ti.amount) as total_amount,
              COUNT(DISTINCT t.id) as transaction_count
       FROM transactions t
       JOIN transaction_items ti ON ti.transaction_id = t.id
       JOIN waste_categories c ON ti.category_id = c.id
       LEFT JOIN waste_price_masters p ON ti.price_id = p.id
       WHERE ${whereClause}
       GROUP BY c.id, c.name, p.group_name, p.price_code
       ORDER BY total_amount DESC`,
      args
    );

    return rows.map((r) => ({
      ...r,
      total_weight_kg: Number(((r.total_weight_gram || 0) / 1000.0).toFixed(3)),
      total_amount: Number(r.total_amount || 0),
      transaction_count: Number(r.transaction_count || 0),
    }));
  }

  private static async getNasabahReportData() {
    const rows = await db.fetchAll<any>(
      `SELECT 
         id,
         customer_id,
         account_no,
         CAST(nik AS TEXT) as nik,
         name,
         CAST(phone AS TEXT) as phone,
         address,
         rt,
         rw,
         kelurahan,
         kecamatan,
         kabupaten_kota,
         nasabah_category,
         email,
         status,
         registration_source,
         created_by,
         updated_by,
         created_at,
         updated_at
       FROM nasabah ORDER BY customer_id ASC`
    );
    return await Promise.all(
      rows.map(async (r) => ({
        ...r,
        balance: await nasabahService.getNasabahBalance(r.id),
      }))
    );
  }

  private static async getPricesReportData() {
    return await db.fetchAll<any>(
      `SELECT p.*, c.name as category_name
       FROM waste_price_masters p
       JOIN waste_categories c ON p.category_id = c.id
       ORDER BY CASE WHEN UPPER(p.status) = 'ACTIVE' THEN 1 ELSE 2 END ASC, c.name ASC`
    );
  }

  // --- Excel Helpers ---
  private static setupExcelHeader(
    ws: ExcelJS.Worksheet,
    title: string,
    subtitle: string,
    colSpan: number
  ) {
    ws.mergeCells(1, 1, 1, colSpan);
    const bankCell = ws.getCell(1, 1);
    bankCell.value = config.BANK_NAME.toUpperCase();
    bankCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF15803D' } };
    bankCell.alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells(2, 1, 2, colSpan);
    const titleCell = ws.getCell(2, 1);
    titleCell.value = title;
    titleCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF1F2937' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

    if (subtitle) {
      ws.mergeCells(3, 1, 3, colSpan);
      const subCell = ws.getCell(3, 1);
      subCell.value = subtitle;
      subCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF4B5563' } };
      subCell.alignment = { horizontal: 'center', vertical: 'middle' };
    }

    ws.addRow([]); // Blank row
  }

  private static styleTableHeader(row: ExcelJS.Row) {
    row.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    row.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF15803D' },
    };
    row.alignment = { horizontal: 'center', vertical: 'middle' };
  }

  private static autoFitColumns(ws: ExcelJS.Worksheet) {
    ws.columns.forEach((col) => {
      let maxLen = 12;
      col.eachCell?.({ includeEmpty: false }, (cell, rowNumber) => {
        if (rowNumber > 4 && cell.value) {
          const len = String(cell.value).length;
          if (len > maxLen) maxLen = len;
        }
      });
      col.width = maxLen + 4;
    });
  }

  // --- PDF Helpers ---
  private static drawPdfReportHeader(doc: PDFKit.PDFDocument, title: string, subtitle: string) {
    doc
      .fontSize(13)
      .font('Helvetica-Bold')
      .fillColor('#15803d')
      .text(config.BANK_NAME.toUpperCase(), { align: 'center' });

    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#1f2937')
      .text(title, { align: 'center' });

    if (subtitle) {
      doc
        .fontSize(8)
        .font('Helvetica-Oblique')
        .fillColor('#6b7280')
        .text(subtitle, { align: 'center' });
    }

    doc.moveDown(0.5);
  }

  private static drawPdfTableHeader(
    doc: PDFKit.PDFDocument,
    y: number,
    cols: { label: string; width: number; align: string }[]
  ) {
    const totalWidth = cols.reduce((a, b) => a + b.width, 0);

    doc.rect(28, y, totalWidth, 16).fill('#15803d');

    let x = 28;
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#ffffff');

    cols.forEach((col) => {
      doc.text(col.label, x + 2, y + 4, {
        width: col.width - 4,
        align: col.align as any,
      });
      x += col.width;
    });
  }
}

export const reportService = ReportService;
