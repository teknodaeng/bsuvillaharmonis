import { db } from '../core/database.js';

export const DDL_SCRIPT = `
CREATE TABLE IF NOT EXISTS account_sequences (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    last_number INTEGER NOT NULL DEFAULT -1
);

INSERT OR IGNORE INTO account_sequences (id, last_number) VALUES (1, -1);

CREATE TABLE IF NOT EXISTS nasabah (
    id TEXT PRIMARY KEY,
    customer_id TEXT UNIQUE NOT NULL,
    account_no TEXT UNIQUE NOT NULL,
    nik TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    rt TEXT,
    rw TEXT,
    kelurahan TEXT,
    kecamatan TEXT,
    kabupaten_kota TEXT,
    nasabah_category TEXT NOT NULL DEFAULT 'Rumah Tangga/Individu',
    email TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'INACTIVE')),
    registration_source TEXT NOT NULL DEFAULT 'SELF' CHECK(registration_source IN ('SELF', 'ADMIN')),
    created_by TEXT,
    updated_by TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_nasabah_nik ON nasabah(nik);
CREATE INDEX IF NOT EXISTS idx_nasabah_customer_id ON nasabah(customer_id);
CREATE INDEX IF NOT EXISTS idx_nasabah_account_no ON nasabah(account_no);
CREATE INDEX IF NOT EXISTS idx_nasabah_status ON nasabah(status);

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    name TEXT,
    email TEXT,
    phone TEXT,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('ADMIN', 'NASABAH')),
    nasabah_id TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'INACTIVE')),
    is_active INTEGER NOT NULL DEFAULT 1,
    last_login_at TEXT,
    created_by TEXT,
    updated_by TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (nasabah_id) REFERENCES nasabah(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_nasabah_id ON users(nasabah_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

CREATE TABLE IF NOT EXISTS waste_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_by TEXT,
    updated_by TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS waste_price_masters (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL,
    price_per_kg INTEGER NOT NULL,
    price_code TEXT,
    group_name TEXT,
    example_items TEXT,
    unit TEXT NOT NULL DEFAULT 'kg',
    effective_date TEXT NOT NULL DEFAULT (date('now')),
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'INACTIVE')),
    notes TEXT,
    created_by TEXT,
    updated_by TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (category_id) REFERENCES waste_categories(id)
);

CREATE INDEX IF NOT EXISTS idx_price_category ON waste_price_masters(category_id);
CREATE INDEX IF NOT EXISTS idx_price_status ON waste_price_masters(status);
CREATE INDEX IF NOT EXISTS idx_price_effective ON waste_price_masters(effective_date);

CREATE TABLE IF NOT EXISTS waste_price_histories (
    id TEXT PRIMARY KEY,
    price_id TEXT NOT NULL,
    category_id TEXT NOT NULL,
    price_per_kg INTEGER NOT NULL,
    status TEXT NOT NULL,
    effective_date TEXT NOT NULL,
    action TEXT NOT NULL CHECK(action IN ('CREATE', 'UPDATE', 'ACTIVATE', 'DEACTIVATE')),
    notes TEXT,
    created_by TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (price_id) REFERENCES waste_price_masters(id),
    FOREIGN KEY (category_id) REFERENCES waste_categories(id)
);

CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    transaction_no TEXT UNIQUE NOT NULL,
    nasabah_id TEXT NOT NULL,
    transaction_date TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('SETOR', 'TARIK')),
    category_id TEXT,
    price_id TEXT,
    weight_gram INTEGER,
    price_per_kg INTEGER,
    amount INTEGER NOT NULL CHECK(amount > 0),
    debit INTEGER NOT NULL DEFAULT 0,
    credit INTEGER NOT NULL DEFAULT 0,
    balance_after INTEGER NOT NULL,
    notes TEXT,
    idempotency_key TEXT UNIQUE,
    created_by TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (nasabah_id) REFERENCES nasabah(id),
    FOREIGN KEY (category_id) REFERENCES waste_categories(id),
    FOREIGN KEY (price_id) REFERENCES waste_price_masters(id)
);

CREATE INDEX IF NOT EXISTS idx_trx_nasabah ON transactions(nasabah_id);
CREATE INDEX IF NOT EXISTS idx_trx_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_trx_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_trx_category ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_trx_price ON transactions(price_id);
CREATE INDEX IF NOT EXISTS idx_trx_no ON transactions(transaction_no);
`;

export async function runMigrations() {
  console.log('[DB] Menjalankan migrasi database...');
  await db.executeMultiple(DDL_SCRIPT);
  console.log('[DB] Migrasi database berhasil dijalankan.');
}
