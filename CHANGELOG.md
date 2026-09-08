# 📝 Catatan Perubahan (Changelog)

## Sistem Operasional Tabungan Bank Sampah Unit (BSU) Villa Harmonis

Seluruh perubahan penting, penambahan fitur, perbaikan bug, penyempurnaan arsitektur, dan pembaruan dokumentasi pada sistem **BSU Villa Harmonis** dicatat secara kronologis dalam dokumen ini.

Format pencatatan mengacu pada panduan [Keep a Changelog](https://keepachangelog.com/id-ID/1.0.0/) dan prinsip [Semantic Versioning](https://semver.org/).

---

## 📌 Rekapitulasi Versi Rilis

- [v1.1.0 (Current - Production Ready)](#v110---2026-09-08-production-ready) — Pembaruan PRD Final, Penyelarasan Dokumen Spesifikasi Sistem & Validasi UAT 100%
- [v1.0.3](#v103---2026-09-06) — Perbaikan Autentikasi Login, Multi-Identifier, & Penanganan Sesi Pengguna
- [v1.0.2](#v102---2026-09-04) — Standardisasi Dependensi, Pembaruan Requirements & Script Otomasi Start
- [v1.0.1](#v101---2026-09-03) — Penyempurnaan Generator Laporan (Text-Wrapping PDF & Auto-Fit Excel) serta Pengujian UAT
- [v1.0.0 (Initial Stable Release)](#v100---2026-09-02) — Peluncuran Sistem Tabungan BSU Villa Harmonis (Fitur Inti & Modul Lengkap)
- [v0.9.0 (Beta / Second Commit)](#v090---2026-08-28) — Integrasi Master Data Dinamis, Transaksi Cerdas Autocomplete, & Manajemen Petugas
- [v0.1.0 (Alpha / First Commit)](#v010---2026-08-20) — Inisialisasi Repositori, Arsitektur Monorepo, & Skema Basis Data Awal

---

## [v1.1.0] - 2026-09-08 (Production Ready)

### 📄 Dokumentasi & Spesifikasi Sistem
- **Pembaruan Menyeluruh Dokumen PRD ([prd.md](prd.md)) ke Versi 1.1**:
  - Menyelaraskan status produk menjadi **Production Ready** (Lulus UAT dan Siap Operasional).
  - Memperbarui deskripsi stack teknologi aktual: React 18 + Vite + Tailwind CSS v3 + Zustand + TanStack Query v5 (Frontend) dan Python 3.10+ + FastAPI + SQLite3/Turso + ReportLab + OpenPyXL (Backend).
  - Mendokumentasikan fitur klasifikasi **Kategori Nasabah** (`Rumah Tangga/Individu`, `Sekolah`, `Instansi`) dan rincian alamat wilayah terstruktur (`rt`, `rw`, `kelurahan`, `kecamatan`, `kabupaten_kota`).
  - Mendokumentasikan integrasi klausul persetujuan wajib **Syarat & Pernyataan (*Terms & Conditions*)** pada registrasi mandiri.
  - Mendokumentasikan modul **Manajemen Pengguna (*User Management*)** pada menu `/admin/master/users` untuk kelola akun petugas admin dan reset password.
  - Memperbarui skema DDL fisik SQL dan model ERD sesuai implementasi riil pada [migrations.py](backend/app/db/migrations.py).
  - Menyempurnakan spesifikasi REST API backend untuk seluruh endpoint (`/auth`, `/admin/nasabah`, `/admin/users`, `/me`, `/master/categories`, `/master/waste-prices`, `/admin/transactions`, `/admin/reports`, `/admin/dashboard`).
  - Menyelaraskan rute frontend, hierarki layout (`PublicLayout`, `AdminLayout`, `NasabahLayout`, `PrintLayout`), dan komponen antarmuka.

---

## [v1.0.3] - 2026-09-06

### 🔒 Autentikasi & Keamanan (Commit `fix login`)
- **Penyempurnaan Multi-Identifier Login**:
  - Memastikan endpoint `/api/v1/auth/login` mengenali berbagai pengenal akun secara instan: ID Nasabah (`bsuvhXXXX`), No. Rekening, NIK 16 digit, maupun Username Admin.
  - Memperbaiki validasi status akun nonaktif agar mengembalikan pesan penolakan yang tepat dan deskriptif (*HTTP 400/403*).
- **Perbaikan Ganti Password Akun**:
  - Menambahkan alias field `current_password` di samping `old_password` pada skema Pydantic [ChangePasswordRequest](backend/app/schemas/auth.py) guna mengatasi kendala kompatibilitas payload dari form profil frontend.
  - Memastikan validasi kecocokan `new_password` dan `confirm_password` berjalan konsisten.
- **Penyelarasan Data Pengguna Login (`/api/v1/auth/me`)**:
  - Memperbaiki pengembalian objek profil nasabah (`nasabah`) dan perhitungan saldo terkini saat sesi login dimuat kembali oleh peramban.

---

## [v1.0.2] - 2026-09-04

### 📦 Dependensi & Otomasi Sistem (Commit `add requirements`)
- **Pembaruan Dependensi Backend ([requirements.txt](backend/requirements.txt))**:
  - Menambahkan dan mengunci versi pustaka pendukung ekspor dokumen: `reportlab` (PDF generation) dan `openpyxl` (Excel spreadsheet generation).
  - Menambahkan dependensi keamanan: `pyjwt` (JSON Web Tokens) dan `passlib[bcrypt]` / `bcrypt` (password hashing).
  - Menambahkan dependensi konfigurasi: `pydantic-settings`, `python-dotenv`, dan `email-validator`.
  - Menambahkan dependensi testing: `pytest` dan `httpx`.
- **Script Otomasi Start Terpadu ([start.sh](start.sh))**:
  - Pembuatan script bash executable untuk mendeteksi ketersediaan virtual environment Python, menginstal dependensi backend & npm frontend jika belum terpasang, serta menyalakan server Uvicorn (port 8000) dan Vite dev server (port 5173) secara bersamaan.

---

## [v1.0.1] - 2026-09-03

### 📊 Generator Dokumen & Pelaporan
- **Solusi Teks Terpotong pada Ekspor PDF ReportLab (*Anti-Text Clipping*)**:
  - Mengonversi seluruh sel data tabel laporan transaksi, rekapitulasi sampah, daftar nasabah, dan master harga dari teks string biasa menjadi komponen `Paragraph`.
  - Menerapkan penataan sel vertikal ke atas (`VALIGN: TOP`) agar data dengan teks panjang (nama lengkap, rincian alamat domisili, atau catatan transaksi) otomatis membungkus (*text-wrapping*) ke baris bawah tanpa terpotong batas kolom tabel.
  - Membedakan orientasi halaman: **PDF Landscape A4** untuk Laporan Transaksi Tabungan (karena memiliki banyak kolom) dan **PDF Portrait A4** untuk Laporan Rekapitulasi, Nasabah & Saldo, dan Master Harga.
- **Penyempurnaan Ekspor Spreadsheet Excel (OpenPyXL)**:
  - Menerapkan penyesuaian lebar kolom otomatis (*auto-fit column width*) berdasarkan panjang teks maksimal per kolom.
  - Menambahkan header korporat hijau BSU Villa Harmonis, border sel tipis yang rapi, pemformatan angka Rupiah (`Rp #,##0`), serta baris akumulasi total kalkulasi.
- **Pengujian Penerimaan Pengguna ([UAT.md](UAT.md))**:
  - Penyusunan dokumen User Acceptance Testing lengkap berisi **37 Skenario Kasus Uji** pada 8 Modul operasional sistem dengan tingkat kelulusan 100% pada kategori kritis (*Critical Severity*).

---

## [v1.0.0] - 2026-09-02 (Initial Stable Release)

### ✨ Peluncuran Fitur Inti Operasional
- **Portal Nasabah Mandiri (*Self-Service*)**:
  - Dashboard nasabah interaktif menampilkan saldo tabungan terkini, total setoran (Rp), total penarikan (Rp), dan 5 mutasi terakhir.
  - Menu Riwayat Tabungan (`/riwayat`) untuk melihat seluruh histori transaksi setor/tarik.
  - Fitur cetak dan unduh struk bukti transaksi digital dalam format **PDF A5** langsung dari akun nasabah.
  - Menu Katalog Harga Sampah Aktif (`/harga-sampah`) untuk transparansi tarif per kg bagi nasabah.
  - Menu Pengaturan Profil Mandiri (`/profil`) untuk pembaruan data diri serta penggantian kata sandi akun nasabah.
- **Pencatatan Transaksi Tabungan Cerdas**:
  - Formulir dual-tab `/admin/transaksi/new`: **SETOR SAMPAH** dan **TARIK TUNAI**.
  - Kalkulasi otomatis nominal kredit setor: `Berat (kg) × Harga/kg`.
  - Penyimpanan presisi timbangan sampah dalam gram integer (`weight_gram`).
  - Validasi saldo seketika untuk penarikan tunai guna mencegah saldo tabungan bernilai negatif.
  - Penomoran transaksi unik otomatis per hari kalender: `TRX-YYYYMMDD-XXXX`.
  - Transaksi bersifat final (*immutable*) dengan pembaruan saldo seketika (*atomic running balance*).
- **Struk Bukti Transaksi Resmi**:
  - Halaman bukti transaksi dengan tata letak struk cetak kasir/bank sampah.
  - Ekspor berkas **PDF A5** dengan informasi lengkap nasabah, jenis mutasi, detail sampah/nominal, saldo akhir, dan catatan.
  - Proteksi kepemilikan: Nasabah hanya dapat membuka struk transaksinya sendiri (*HTTP 403 Forbidden* jika mengakses struk nasabah lain).

---

## [v0.9.0] - 2026-08-28 (Beta / Second Commit)

### 👥 Manajemen Pengguna & Nasabah Lanjutan
- **Penyempurnaan Form Registrasi Nasabah**:
  - Penambahan klasifikasi `nasabah_category` (`Rumah Tangga/Individu`, `Sekolah`, `Instansi`).
  - Penambahan kolom wilayah: `rt`, `rw`, `kelurahan`, `kecamatan`, dan `kabupaten_kota`.
  - Penambahan klausul Syarat & Pernyataan pembukaan rekening bank sampah dengan modal dialog ketentuan dan validasi checkbox wajib disetujui.
  - Penyempurnaan tampilan sukses registrasi mandiri yang menampilkan ID Nasabah `bsuvhXXXX` yang baru saja diterbitkan.
- **Modul Manajemen Pengguna / Petugas Admin (`/admin/master/users`)**:
  - Pembuatan endpoint backend `/api/v1/admin/users` untuk pencarian, filter peran, dan filter status user.
  - Halaman antarmuka antarpengguna `UserManagementPage.jsx` dengan tab peran `ALL`, `ADMIN`, dan `NASABAH`.
  - Fitur penambahan akun petugas baru oleh administrator.
  - Fitur *Reset Password* pengguna oleh administrator.
  - Fitur *Toggle Status* aktif/nonaktif akun petugas.
- **Modul Manajemen Nasabah oleh Admin (`/admin/nasabah`)**:
  - Daftar nasabah dengan pencarian cepat (*fuzzy search* nama, NIK, ID, nomor HP, kelurahan, kecamatan).
  - Halaman detail nasabah (`NasabahDetailPage.jsx`) dengan tab profil dan riwayat transaksi.
  - Form edit nasabah yang mengizinkan koreksi NIK (dengan validasi anti-duplikasi), nomor HP, alamat, dan kategori, sementara ID Nasabah/No. Rekening terkunci permanen (*read-only*).
  - Pintasan cepat (*quick action*) untuk langsung mencatat setor atau tarik tunai bagi nasabah bersangkutan.

### 🏷️ Master Kategori & Harga Sampah Dinamis
- **Redesain Skema Kategori & Harga**:
  - Melepas kolom `code` dari tabel `waste_categories` agar kategori murni mendefinisikan jenis bahan (Plastik, Kertas, Besi, Kaca, Minyak Jelantah).
  - Menambahkan kolom `price_code`, `group_name`, dan `example_items` pada tabel `waste_price_masters` untuk fleksibilitas katalog harga sesuai ketetapan Bank Sampah Pusat.
  - Mengimplementasikan aturan bisnis *auto-deactivation*: Penetapan harga aktif baru secara otomatis menonaktifkan harga aktif sebelumnya pada kategori yang sama.
  - Menambahkan relasi `price_id` pada tabel `transactions`.
- **Komponen Autocomplete pada Transaksi**:
  - Pengembangan komponen antarmuka `AutocompleteSelect.jsx`.
  - Autocomplete pemilihan nasabah aktif dengan preview ID, nama, NIK, alamat, dan saldo tabungan terkini.
  - Autocomplete pemilihan kelompok sampah aktif dengan preview tarif harga per kg dan contoh barang.

---

## [v0.1.0] - 2026-08-20 (Alpha / First Commit)

### 🚀 Inisialisasi Arsitektur & Fondasi Sistem
- **Struktur Repositori Monorepo**:
  - Direktori `backend/`: REST API berbasis FastAPI, Pydantic, dan Uvicorn.
  - Direktori `frontend/`: Single Page Application (SPA) berbasis React 18 dan Vite.
- **Fondasi Skema Database**:
  - Pembuatan skrip migrasi awal DDL SQL [migrations.py](backend/app/db/migrations.py).
  - Tabel `account_sequences` untuk penomoran rekening otomatis `bsuvh0000` s/d `bsuvh9999`.
  - Tabel dasar: `nasabah`, `users`, `waste_categories`, `waste_price_masters`, `waste_price_histories`, dan `transactions`.
  - Skrip *database seeder* [seed.py](backend/app/db/seed.py) untuk akun administrator awal (`admin` / `AdminPassword123!`) dan 5 kategori sampah contoh dengan tarif aktif.
- **Autentikasi Awal**:
  - Implementasi enkripsi password Bcrypt dan token otorisasi JWT.
  - Rute publik `/login` dan `/registrasi`.
- **Dokumentasi Awal**:
  - Dokumen kebutuhan awal [prd.md](prd.md) Versi 1.0.
  - Dokumen desain teknis antarmuka [Design.md](Design.md).
  - Panduan operasional [README.md](README.md).
