import logging
from app.core.database import db

logger = logging.getLogger(__name__)

DDL_SCRIPT = """
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
"""


def run_migrations():
    """Execute DDL schema migration script."""
    logger.info("Running database migrations...")
    statements = [stmt.strip() for stmt in DDL_SCRIPT.split(";") if stmt.strip()]
    with db.connection() as conn:
        cursor = conn.cursor()
        
        # Add new columns to nasabah table if they don't exist
        for col in ["rt", "rw", "kelurahan", "kecamatan", "kabupaten_kota"]:
            try:
                cursor.execute(f"ALTER TABLE nasabah ADD COLUMN {col} TEXT;")
            except Exception:
                pass  # Column likely exists

        try:
            cursor.execute("ALTER TABLE nasabah ADD COLUMN nasabah_category TEXT DEFAULT 'Rumah Tangga/Individu';")
        except Exception:
            pass  # Column likely exists

        # Add new columns to users table if they don't exist
        for col in ["name", "email", "phone", "created_by", "updated_by"]:
            try:
                cursor.execute(f"ALTER TABLE users ADD COLUMN {col} TEXT;")
            except Exception:
                pass  # Column likely exists

        try:
            cursor.execute("ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'ACTIVE';")
        except Exception:
            pass

        # Execute statements in DDL
        for stmt in statements:
            try:
                cursor.execute(stmt)
            except Exception as e:
                logger.debug(f"DDL statement notice: {stmt[:30]}... ({e})")

        # Drop code column in waste_categories if it still exists
        try:
            cursor.execute("PRAGMA foreign_keys = OFF;")
            cols = [c[1] for c in cursor.execute("PRAGMA table_info(waste_categories)").fetchall()]
            if "code" in cols:
                cursor.execute("DROP INDEX IF EXISTS idx_categories_code;")
                cursor.execute("""
                    CREATE TABLE waste_categories_new (
                        id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        description TEXT,
                        is_active INTEGER NOT NULL DEFAULT 1,
                        created_by TEXT,
                        updated_by TEXT,
                        created_at TEXT NOT NULL DEFAULT (datetime('now')),
                        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
                    );
                """)
                cursor.execute("""
                    INSERT INTO waste_categories_new (id, name, description, is_active, created_by, updated_by, created_at, updated_at)
                    SELECT id, name, description, is_active, created_by, updated_by, created_at, updated_at
                    FROM waste_categories;
                """)
                cursor.execute("DROP TABLE waste_categories;")
                cursor.execute("ALTER TABLE waste_categories_new RENAME TO waste_categories;")
            cursor.execute("PRAGMA foreign_keys = ON;")
        except Exception as e:
            logger.warning(f"Note on waste_categories migration: {e}")

        # Backfill user fields from nasabah where linked
        try:
            cursor.execute("""
                UPDATE users
                SET 
                    name = (SELECT n.name FROM nasabah n WHERE n.id = users.nasabah_id),
                    email = (SELECT n.email FROM nasabah n WHERE n.id = users.nasabah_id),
                    phone = (SELECT n.phone FROM nasabah n WHERE n.id = users.nasabah_id),
                    status = COALESCE((SELECT n.status FROM nasabah n WHERE n.id = users.nasabah_id), 'ACTIVE')
                WHERE users.role = 'NASABAH' AND users.nasabah_id IS NOT NULL AND (users.name IS NULL OR users.name = '');
            """)
        except Exception as e:
            logger.warning(f"Note on users nasabah backfill: {e}")

        # Backfill default admin details if missing
        try:
            cursor.execute("""
                UPDATE users
                SET 
                    name = COALESCE(NULLIF(name, ''), 'Administrator Utama'),
                    email = COALESCE(NULLIF(email, ''), 'admin@bsuvillaharmonis.id'),
                    phone = COALESCE(NULLIF(phone, ''), '081234567890'),
                    status = 'ACTIVE'
                WHERE username = 'admin';
            """)
        except Exception as e:
            logger.warning(f"Note on admin user backfill: {e}")

        # Add new columns to waste_price_masters table if they don't exist
        try:
            cursor.execute("ALTER TABLE waste_price_masters ADD COLUMN price_code TEXT;")
        except Exception:
            pass # Column likely exists
            
        try:
            cursor.execute("ALTER TABLE waste_price_masters ADD COLUMN group_name TEXT;")
        except Exception:
            pass # Column likely exists
            
        try:
            cursor.execute("ALTER TABLE waste_price_masters ADD COLUMN example_items TEXT;")
        except Exception:
            pass # Column likely exists

        # Add price_id to transactions table if it doesn't exist
        try:
            cursor.execute("ALTER TABLE transactions ADD COLUMN price_id TEXT;")
        except Exception:
            pass # Column likely exists
            
    logger.info("Database migrations completed successfully.")


if __name__ == "__main__":
    run_migrations()
