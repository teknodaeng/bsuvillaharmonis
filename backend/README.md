# BSU Villa Harmonis - Backend API

REST API backend untuk sistem **Tabungan Bank Sampah BSU Villa Harmonis** menggunakan **Python + FastAPI** dan **Turso Database**.

---

## 🚀 Cara Menjalankan

### 1. Masuk ke direktori backend dan aktifkan virtualenv
```bash
cd backend
source venv/bin/activate
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
*Catatan: Jika `DATABASE_URL` dikosongkan, backend secara otomatis menggunakan SQLite lokal (`bsuvh.db`).*

### 3. Menjalankan Server Development
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Akses API Documentation:
- Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)
- ReDoc: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## 🔑 Akun Default Awal (Seeded)

- **Username / Identifier:** `admin`
- **Password:** `AdminPassword123!`
- **Role:** `ADMIN`

---

## 🧪 Menjalankan Automated Tests
```bash
pytest -v
```
