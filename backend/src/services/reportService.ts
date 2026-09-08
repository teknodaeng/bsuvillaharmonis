import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { db } from '../core/database.js';
import { config } from '../core/config.js';
import { formatRupiah } from '../utils/currency.js';
import { formatDate, formatDateTime, formatKg } from '../utils/formatting.js';
import { sanitizeExcelRow } from '../utils/sanitizeExcel.js';
import { nasabahService } from './nasabahService.js';

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

  // --- Internal Data Fetchers ---
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
              SUM(t.weight_gram) as total_weight_gram,
              SUM(t.credit) as total_amount,
              COUNT(t.id) as transaction_count
       FROM transactions t
       JOIN waste_categories c ON t.category_id = c.id
       LEFT JOIN waste_price_masters p ON t.price_id = p.id
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
      `SELECT * FROM nasabah ORDER BY customer_id ASC`
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
