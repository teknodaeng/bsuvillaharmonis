import { v4 as uuidv4 } from 'uuid';
import { db } from '../core/database.js';
import { hashPassword } from '../core/security.js';

export async function seedDatabase() {
  console.log('[SEED] Memeriksa data awal database...');

  // 1. Seed Default Admin
  const adminUser = await db.fetchOne('SELECT * FROM users WHERE username = ?', ['admin']);
  if (!adminUser) {
    const adminId = uuidv4();
    const hashedPwd = await hashPassword('AdminPassword123!');
    await db.execute(
      `INSERT INTO users (id, username, name, email, phone, password_hash, role, nasabah_id, status, is_active)
       VALUES (?, ?, 'Administrator Utama', 'admin@bsuvillaharmonis.id', '081234567890', ?, 'ADMIN', NULL, 'ACTIVE', 1)`,
      [adminId, 'admin', hashedPwd]
    );
    console.log('[SEED] Default admin dibuat: admin / AdminPassword123!');
  }

  // 2. Seed Default Categories & Active Prices
  const categoriesData = [
    {
      name: 'Plastik PET (Botol Bening)',
      description: 'Botol plastik bening/transparan bersih tanpa tutup',
      price: 3500,
      group_name: 'Plastik',
      price_code: 'PLAS-PET',
      example_items: 'Botol air mineral, botol soda bersih',
    },
    {
      name: 'Kertas Kardus / Karton',
      description: 'Kardus cokelat kering dan terlipat rapi',
      price: 1800,
      group_name: 'Kertas',
      price_code: 'KERT-KRD',
      example_items: 'Kardus mie instan, kardus elektronik, box karton',
    },
    {
      name: 'Logam Besi & Kaleng',
      description: 'Besi tua, kaleng biskuit, kaleng susu bersih',
      price: 4000,
      group_name: 'Logam',
      price_code: 'LOG-KAL',
      example_items: 'Kaleng susu kental, kaleng biskuit, paku bekas',
    },
    {
      name: 'Minyak Jelantah',
      description: 'Minyak goreng bekas pakai dalam botol tertutup',
      price: 6000,
      group_name: 'Minyak',
      price_code: 'MNY-JLT',
      example_items: 'Minyak jelantah rumahan bersih dari endapan',
    },
    {
      name: 'Kaca / Botol Kaca',
      description: 'Botol sirup, kecap, dan botol kaca utuh',
      price: 800,
      group_name: 'Kaca',
      price_code: 'KAC-BTL',
      example_items: 'Botol sirup marjan, botol kecap, botol saus',
    },
  ];

  for (const cat of categoriesData) {
    const existingCat = await db.fetchOne('SELECT * FROM waste_categories WHERE name = ?', [cat.name]);
    if (!existingCat) {
      const catId = uuidv4();
      await db.execute(
        `INSERT INTO waste_categories (id, name, description, is_active, created_by)
         VALUES (?, ?, ?, 1, 'SYSTEM')`,
        [catId, cat.name, cat.description]
      );

      const priceId = uuidv4();
      await db.execute(
        `INSERT INTO waste_price_masters (id, category_id, price_per_kg, price_code, group_name, example_items, unit, status, notes, created_by)
         VALUES (?, ?, ?, ?, ?, ?, 'kg', 'ACTIVE', 'Ketetapan Bank Sampah Pusat', 'SYSTEM')`,
        [priceId, catId, cat.price, cat.price_code, cat.group_name, cat.example_items]
      );
      console.log(`[SEED] Kategori ${cat.name} dibuat dengan harga Rp ${cat.price}/kg`);
    }
  }

  console.log('[SEED] Inisialisasi data awal selesai.');
}
