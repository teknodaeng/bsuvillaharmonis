# BSU Villa Harmonis - Backend API

REST API backend untuk sistem **Tabungan Bank Sampah BSU Villa Harmonis** menggunakan **Hono Web Application Framework (TypeScript)**, **Node.js**, dan **Turso / SQLite Database**.

---

## 🚀 Cara Menjalankan

### 1. Masuk ke direktori backend dan instal dependensi
```bash
cd backend
npm install
```

### 2. Konfigurasi Environment (`.env`)
Salin `.env.example` ke `.env`:
```bash
cp .env.example .env
```

Untuk menghubungkan ke **Turso Cloud Database**, isi:
```env
DATABASE_URL=libsql://your-turso-database-name.turso.io
TURSO_AUTH_TOKEN=your-turso-auth-token
```
*Catatan: Jika `DATABASE_URL` dikosongkan atau menggunakan `file:bsuvh.db`, backend secara otomatis menggunakan SQLite lokal (`bsuvh.db`).*

### 3. Menjalankan Server Development
```bash
npm run dev
```
Server backend akan berjalan di [http://localhost:8000](http://localhost:8000) dengan hot reload via `tsx watch`.

### 4. Build dan Jalankan Versi Produksi
```bash
npm run build
npm start
```

---

## 🔑 Akun Default Awal (Seeded)

- **Username / Identifier:** `admin`
- **Password:** `AdminPassword123!`
- **Role:** `ADMIN`

---

## 🧪 Menjalankan Automated Tests
```bash
npm test
```
*Menggunakan [Vitest](https://vitest.dev/) untuk menguji Auth, Mutasi Transaksi & Guard Saldo, Laporan PDF/Excel, dan Endpoint API.*
