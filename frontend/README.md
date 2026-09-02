# Frontend Web Application BSU Villa Harmonis

Aplikasi antarmuka web (Frontend) sistem **Tabungan Bank Sampah Lingkungan BSU Villa Harmonis** berbasis **ReactJS + Vite + Tailwind CSS + TanStack Query + Zustand + Lucide React**.

---

## 🚀 Panduan Menjalankan Frontend

### 1. Prasyarat
- **Node.js**: v18+ atau v20+ LTS
- **Backend API**: Berjalan di `http://localhost:8001/api/v1`

### 2. Konfigurasi Lingkungan (`.env`)
Salin file `.env.example` ke `.env`:
```bash
cp .env.example .env
```
Isi konfigurasi pada `.env`:
```env
VITE_API_BASE_URL=http://localhost:8001/api/v1
VITE_APP_NAME="BSU Villa Harmonis"
VITE_APP_SHORT_NAME="BSU"
```

### 3. Instalasi Dependensi & Development Server
```bash
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```
Akses di browser: [http://localhost:5173](http://localhost:5173)

### 4. Build untuk Produksi
```bash
npm run build
npm run preview
```

---

## 🔑 Akun Uji Coba

### 1. Akun Petugas / Administrator
- **Identifier:** `admin`
- **Password:** `AdminPassword123!`
- **Role:** `ADMIN`

### 2. Akun Nasabah (Pendaftaran Mandiri)
- Kunjungi halaman: [http://localhost:5173/registrasi](http://localhost:5173/registrasi)
- Masukkan NIK (16 digit), Nama, No. HP, Alamat, dan Password.
- Sistem otomatis menghasilkan ID Nasabah sequential (`bsuvh0000`, `bsuvh0001`, dst.).
- Nasabah dapat login menggunakan ID Nasabah maupun NIK.

---

## 📑 Struktur Fitur Frontend

1. **Autentikasi & Registrasi Mandiri:**
   - `/login` - Masuk menggunakan multi-identifier (ID `bsuvhXXXX`, NIK, Rekening, atau username Admin).
   - `/registrasi` - Pendaftaran mandiri calon nasabah baru dengan validasi instan.

2. **Portal Nasabah:**
   - `/dashboard` - Kartu saldo tabungan, total setoran, total penarikan, dan ringkasan 5 mutasi terakhir.
   - `/riwayat` - Riwayat transaksi lengkap dengan filter jenis mutasi & tanggal.
   - `/riwayat/:transactionId/bukti` - Bukti transaksi resmi siap cetak dan unduh PDF.
   - `/harga-sampah` - Katalog harga beli sampah aktif per kilogram beserta tips pemilahan.
   - `/profil` - Data identitas nasabah dan formulir ganti password.

3. **Portal Admin:**
   - `/admin/dashboard` - Statistik operasional bank sampah (nasabah aktif, total saldo beredar, mutasi bulanan).
   - `/admin/nasabah` - Manajemen nasabah, pencarian instan, dan toggle status (Aktif/Nonaktif).
   - `/admin/nasabah/new` - Loket pendaftaran nasabah baru oleh petugas.
   - `/admin/nasabah/:nasabahId` - Profil detail, saldo, dan riwayat mutasi nasabah.
   - `/admin/transaksi` - Rekap seluruh transaksi dengan filter komprehensif.
   - `/admin/transaksi/new` - Loket pencatatan transaksi:
     - **Tab Setor:** Pilih nasabah, pilih kategori sampah, input berat (kg), kalkulasi kredit otomatis (`berat x harga`), cetak struk.
     - **Tab Tarik Tunai:** Validasi nominal penarikan terhadap saldo nasabah, penarikan instan.
   - `/admin/master/kategori` - Kelola master kategori jenis sampah.
   - `/admin/master/harga-sampah` - Penetapan tarif harga sampah aktif (otomatis menonaktifkan harga lama).
   - `/admin/laporan` - Unduh instan 4 jenis laporan (Transaksi, Rekap Kategori, Nasabah, Master Harga) format **Excel (.xlsx)** & **PDF (.pdf)**.
