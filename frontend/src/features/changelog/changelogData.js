export const CHANGELOG_DATA = [
  {
    version: "v2.2.0",
    date: "09 Oktober 2026",
    isCurrent: true,
    tag: "Current",
    title: "Pilihan Waktu Transaksi, Halaman Catatan Perubahan & Versi, Penyelarasan Struk, serta Sinkronisasi Distribusi Kategori",
    badge: "Versi Terkini",
    badgeColor: "emerald",
    summary:
      "Pilihan tanggal & jam transaksi fleksibel untuk mendukung transaksi susulan (backdate), rekaman database presisi, halaman interaktif catatan perubahan (changelog) dengan penampil versi aplikasi di sidebar admin dan footer nasabah, penataan struk di tengah, serta sinkronisasi agregasi multi-item dashboard & filter kategori aktif.",
    sections: [
      {
        title: "Halaman Catatan Perubahan (Changelog) & Versi Aplikasi",
        type: "feature",
        icon: "FileText",
        items: [
          "Halaman interaktif Catatan Perubahan (/admin/changelog dan /changelog) menampilkan versi rilis aktif aplikasi (v2.2.0), tanggal rilis, dan histori pembaruan komprehensif.",
          "Fitur pencarian seketika (real-time search) dan filter kategori perubahan (Fitur Baru, Penyempurnaan, Perbaikan Bug).",
          "Menu 'Catatan Perubahan' pada sidebar navigasi Admin dengan ikon riwayat dan badge versi pada header sidebar.",
          "Tautan footer 'Catatan Perubahan (Changelog)' pada portal nasabah dan badge versi aplikasi.",
          "Konfigurasi routing terproteksi dan RoleGuard yang mengarahkan akses admin dan nasabah secara aman dan mulus.",
        ],
      },
      {
        title: "Pilihan Tanggal & Waktu Transaksi (Catat Transaksi Baru)",
        type: "feature",
        icon: "Clock",
        items: [
          "Input Tanggal & Jam Dinamis (datetime-local) terintegrasi pada kartu Informasi Nasabah & Waktu Transaksi untuk transaksi SETOR maupun TARIK.",
          "Nilai awal otomatis terisi waktu saat ini (current timestamp) dengan tombol aksi cepat 'Set ke Waktu Sekarang'.",
          "Teks preview format waktu lokal Indonesia secara seketika (real-time), misalnya: 'Jumat, 09 Oktober 2026 • 18:25 WITA'.",
          "Dukungan pencatatan transaksi susulan (backdating) dengan penomoran TRX-YYYYMMDD yang sinkron dengan tanggal transaksi.",
          "Pencatatan presisi dan final ke kolom transactions.transaction_date, transactions.created_at, serta transaction_items.created_at dalam format YYYY-MM-DD HH:mm:ss tanpa distorsi pergeseran zona waktu UTC.",
        ],
      },
      {
        title: "Penyempurnaan Tata Letak & Jam Cetak Bukti Transaksi",
        type: "improvement",
        icon: "Receipt",
        items: [
          "Tata letak paragraf footer ucapan terima kasih dan keterangan cetak diposisikan presisi di tengah halaman struk PDF A5 (center-aligned).",
          "Sinkronisasi jam cetak struk (printed_at): waktu cetak struk otomatis mengikuti waktu transaksi yang dicatat, bukan waktu penekanan tombol cetak.",
        ],
      },
      {
        title: "Distribusi Berat Sampah per Kategori & Filter 0 Kg",
        type: "fix",
        icon: "Scale",
        items: [
          "Agregasi data distribusi kategori kini membaca tabel rincian transaction_items, menyelesaikan masalah ketidaksinkronan di mana transaksi setor multi-item sebelumnya terlewat.",
          "Akumulasi total kilogram dan persentase kontribusi per kategori sampah kini 100% sinkron dan identik dengan metrik Total Sampah Terkumpul.",
          "Penyaringan kategori tanpa transaksi: mengeliminasi kategori sampah bernilai 0 kg sehingga dashboard hanya menampilkan kelompok sampah yang aktif memiliki data setoran.",
        ],
      },
    ],
  },
  {
    version: "v2.1.0",
    date: "14 September 2026",
    isCurrent: false,
    tag: "Stable",
    title: "Multi-Item Waste Deposit, Receipt Printing, Nasabah List Hardening & Vitest Expansion",
    badge: "Major Update",
    badgeColor: "blue",
    summary:
      "Dukungan setor banyak jenis sampah dalam satu transaksi (multi-item), generator struk kasir & PDF otomatis, solusi 64-bit integer overflow NIK, validasi RT/RW 1-3 digit, dan ekspansi 41 skenario automated test suite Vitest.",
    sections: [
      {
        title: "Setor Sampah Multi-Item (Banyak Jenis Sampah dalam 1 Transaksi)",
        type: "feature",
        icon: "Layers",
        items: [
          "Tabel basis data baru transaction_items untuk mencatat setiap rincian item sampah dalam satu transaksi setor.",
          "Mekanisme auto-backfill cerdas yang mengonversi data transaksi setor tunggal historis ke dalam transaction_items saat server dijalankan.",
          "Formulir setor dinamis dengan tombol tambah/hapus baris item dan kalkulasi subtotal instan (Berat kg × Tarif/kg).",
          "Laporan Rekapitulasi per Kelompok Sampah kini menghitung volume dan omzet berdasarkan tabel rincian transaction_items.",
        ],
      },
      {
        title: "Penyempurnaan Bukti Transaksi (Struk Kasir & PDF)",
        type: "improvement",
        icon: "Receipt",
        items: [
          "Desain struk kasir modern menampilkan rincian tabel multi-item barang serta identitas petugas kasir.",
          "Optimalisasi CSS cetak (@media print) ramah printer thermal kasir dan format cetak kertas A5.",
          "Generator struk PDF dinamis menggunakan PDFKit dengan text-wrapping otomatis dan penyesuaian tinggi proporsional.",
        ],
      },
      {
        title: "Perbaikan & Penguatan Keamanan Sistem",
        type: "security",
        icon: "ShieldCheck",
        items: [
          "Solusi tuntas 64-bit integer overflow LibSQL pada NIK 16 digit nasabah dengan standardisasi TEXT murni dan CAST explicit.",
          "Dukungan nomor RT dan RW fleksibel 1 hingga 3 digit dengan type coercion otomatis.",
          "Penerapan middleware rate limiting pada endpoint autentikasi login (HTTP 429 proteksi brute-force).",
          "Sanitasi formula spreadsheet ExcelJS guna mencegah eksploitasi formula injection.",
          "Ekspansi test suite Vitest menjadi 7 test files dengan 41 skenario pengujian otomatis (100% lulus).",
        ],
      },
    ],
  },
  {
    version: "v2.0.0",
    date: "08 September 2026",
    isCurrent: false,
    tag: "Architecture",
    title: "Modernisasi Arsitektur Backend ke Hono Web Application Framework (TypeScript)",
    badge: "Architecture Modernization",
    badgeColor: "purple",
    summary:
      "Transformasi menyeluruh backend dari Python FastAPI ke TypeScript + Hono v4 dengan database client Turso LibSQL, transaksi atomik ACID, dan performa tinggi.",
    sections: [
      {
        title: "Implementasi Backend TypeScript + Hono Framework",
        type: "feature",
        icon: "Cpu",
        items: [
          "Migrasi total arsitektur ke Hono Web Application Framework v4 (@hono/node-server) berbasis Node.js 20+ dan TypeScript ESM.",
          "Struktur kode modular: core, db, middleware, schemas, services, dan routes.",
          "Validasi schema terpusat menggunakan Zod dan @hono/zod-validator.",
          "Penyelarasan seluruh endpoint API dengan frontend React tanpa mengubah kontrak data operasional.",
        ],
      },
    ],
  },
  {
    version: "v1.1.0",
    date: "08 September 2026",
    isCurrent: false,
    tag: "Milestone",
    title: "Production Ready - Penyelarasan Spesifikasi Sistem & Validasi UAT 100%",
    badge: "Production Ready",
    badgeColor: "emerald",
    summary:
      "Penyelarasan menyeluruh spesifikasi produk PRD v1.1, dokumentasi arsitektur fisik, integrasi klausul Syarat & Pernyataan, modul manajemen pengguna petugas, dan kelulusan 100% UAT.",
    sections: [
      {
        title: "Dokumentasi & Validasi Sistem",
        type: "improvement",
        icon: "CheckCircle",
        items: [
          "Status produk ditetapkan menjadi Production Ready (Lulus UAT dan Siap Operasional).",
          "Dokumentasi fitur Kategori Nasabah (Rumah Tangga/Individu, Sekolah, Instansi) dan data alamat wilayah terstruktur.",
          "Integrasi klausul persetujuan Syarat & Pernyataan (Terms & Conditions) pada registrasi mandiri nasabah.",
          "Manajemen Pengguna Petugas (/admin/master/users) untuk kelola akun admin dan reset password.",
        ],
      },
    ],
  },
  {
    version: "v1.0.3",
    date: "06 September 2026",
    isCurrent: false,
    tag: "Patch",
    title: "Perbaikan Autentikasi Multi-Identifier & Penanganan Sesi Pengguna",
    badge: "Bug Fix",
    badgeColor: "amber",
    summary:
      "Dukungan login multi-identifier (ID nasabah, NIK 16 digit, no. rekening, username) dan perbaikan ganti password akun.",
    sections: [
      {
        title: "Autentikasi & Akun",
        type: "fix",
        icon: "Key",
        items: [
          "Endpoint /api/v1/auth/login mengenali multi-identifier secara instan.",
          "Penolakan akun nonaktif yang lebih jelas dan deskriptif.",
          "Dukungan field current_password dan old_password pada ganti password profil.",
        ],
      },
    ],
  },
  {
    version: "v1.0.2",
    date: "04 September 2026",
    isCurrent: false,
    tag: "Patch",
    title: "Standardisasi Dependensi & Skrip Otomasi Start",
    badge: "Maintenance",
    badgeColor: "slate",
    summary:
      "Penguncian versi library ekspor dokumen (ReportLab, OpenPyXL), dependensi keamanan JWT, dan skrip start sistem.",
    sections: [
      {
        title: "Dependensi & Pemeliharaan",
        type: "improvement",
        icon: "Package",
        items: [
          "Pembaruan dan penguncian requirements pustaka generator dokumen PDF & Excel.",
          "Penyempurnaan skrip start otomatis dan pemeriksaan port backend/frontend.",
        ],
      },
    ],
  },
  {
    version: "v1.0.1",
    date: "03 September 2026",
    isCurrent: false,
    tag: "Minor",
    title: "Penyempurnaan Generator Laporan (Anti-Text Clipping PDF & Auto-Fit Excel) serta Pengujian UAT",
    badge: "Enhancement",
    badgeColor: "indigo",
    summary:
      "Solusi anti-text clipping pada PDF dengan Paragraph wrapping, auto-fit lebar kolom spreadsheet Excel, dan penyusunan 37 skenario UAT.",
    sections: [
      {
        title: "Generator Dokumen & Pelaporan",
        type: "improvement",
        icon: "FileSpreadsheet",
        items: [
          "Semua sel tabel laporan dibungkus Paragraph dengan VALIGN TOP untuk mencegah teks terpotong.",
          "Auto-fit lebar kolom spreadsheet Excel berdasarkan panjang teks maksimal per kolom.",
          "Penyusunan dokumen User Acceptance Testing lengkap berisi 37 skenario kasus uji.",
        ],
      },
    ],
  },
  {
    version: "v1.0.0",
    date: "02 September 2026",
    isCurrent: false,
    tag: "Major",
    title: "Peluncuran Sistem Tabungan BSU Villa Harmonis (Fitur Inti & Modul Lengkap)",
    badge: "Initial Release",
    badgeColor: "emerald",
    summary:
      "Peluncuran perdana sistem tabungan bank sampah: portal nasabah mandiri, transaksi setor & tarik tunai, cetak bukti struk, dan ekspor laporan.",
    sections: [
      {
        title: "Fitur Inti Operasional",
        type: "feature",
        icon: "Sparkles",
        items: [
          "Portal nasabah mandiri: dashboard saldo, riwayat mutasi, dan unduh struk digital.",
          "Pencatatan transaksi tabungan: setor sampah (kredit) dan tarik tunai (debit) dengan running balance otomatis.",
          "Struk bukti transaksi resmi format cetak A5 dan proteksi kepemilikan data nasabah.",
          "Ekspor laporan komprehensif format PDF dan Excel untuk rekapitulasi berkala.",
        ],
      },
    ],
  },
  {
    version: "v0.9.0",
    date: "28 Agustus 2026",
    isCurrent: false,
    tag: "Beta",
    title: "Integrasi Master Data Dinamis, Transaksi Cerdas Autocomplete, & Manajemen Petugas",
    badge: "Beta Release",
    badgeColor: "teal",
    summary:
      "Pemisahan master kategori dan harga sampah dinamis, autocomplete pencarian nasabah & harga, serta modul manajemen user admin.",
    sections: [
      {
        title: "Master Data & Pengguna",
        type: "feature",
        icon: "Database",
        items: [
          "Redesain skema kategori dan harga sampah dinamis dengan riwayat masa berlaku.",
          "Komponen pencarian autocomplete pada form setor dan tarik tunai.",
          "Modul manajemen user admin (/admin/master/users) untuk kelola akun petugas loket.",
        ],
      },
    ],
  },
  {
    version: "v0.1.0",
    date: "20 Agustus 2026",
    isCurrent: false,
    tag: "Alpha",
    title: "Inisialisasi Repositori, Arsitektur Monorepo, & Skema Basis Data Awal",
    badge: "Alpha Release",
    badgeColor: "slate",
    summary:
      "Struktur dasar repositori monorepo, skema basis data awal SQLite, autentikasi Bcrypt + JWT, dan fondasi antarmuka React.",
    sections: [
      {
        title: "Fondasi Sistem",
        type: "feature",
        icon: "Code",
        items: [
          "Inisialisasi repositori monorepo backend dan frontend SPA.",
          "Skema DDL tabel awal: nasabah, users, categories, price_masters, dan transactions.",
          "Autentikasi dasar JWT dan hashing Bcrypt.",
        ],
      },
    ],
  },
];
