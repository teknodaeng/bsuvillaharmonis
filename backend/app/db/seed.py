import logging
import uuid
from app.core.database import db
from app.core.security import get_password_hash

logger = logging.getLogger(__name__)


def seed_database():
    """Seed initial administrator account, sample categories, and active prices."""
    logger.info("Seeding initial data...")
    
    # 1. Seed Default Admin
    admin_user = db.fetch_one("SELECT * FROM users WHERE username = ?", ("admin",))
    if not admin_user:
        admin_id = str(uuid.uuid4())
        hashed_pwd = get_password_hash("AdminPassword123!")
        db.execute(
            """
            INSERT INTO users (id, username, name, email, phone, password_hash, role, nasabah_id, status, is_active)
            VALUES (?, ?, 'Administrator Utama', 'admin@bsuvillaharmonis.id', '081234567890', ?, 'ADMIN', NULL, 'ACTIVE', 1)
            """,
            (admin_id, "admin", hashed_pwd)
        )
        logger.info("Created default admin user: admin / AdminPassword123!")
    
    # 2. Seed Default Categories & Prices
    categories_data = [
        {
            "name": "Plastik PET (Botol Bening)",
            "description": "Botol plastik bening/transparan bersih tanpa tutup",
            "price": 3500,
        },
        {
            "name": "Kertas Kardus / Karton",
            "description": "Kardus cokelat kering dan terlipat rapi",
            "price": 1800,
        },
        {
            "name": "Logam Besi & Kaleng",
            "description": "Besi tua, kaleng biskuit, kaleng susu bersih",
            "price": 4000,
        },
        {
            "name": "Minyak Jelantah",
            "description": "Minyak goreng bekas pakai dalam botol tertutup",
            "price": 6000,
        },
        {
            "name": "Kaca / Botol Kaca",
            "description": "Botol sirup, kecap, dan botol kaca utuh",
            "price": 800,
        },
    ]

    for cat in categories_data:
        existing_cat = db.fetch_one("SELECT * FROM waste_categories WHERE name = ?", (cat["name"],))
        if not existing_cat:
            cat_id = str(uuid.uuid4())
            db.execute(
                """
                INSERT INTO waste_categories (id, name, description, is_active, created_by)
                VALUES (?, ?, ?, 1, 'SYSTEM')
                """,
                (cat_id, cat["name"], cat["description"])
            )
            # Create active price
            price_id = str(uuid.uuid4())
            db.execute(
                """
                INSERT INTO waste_price_masters (id, category_id, price_per_kg, unit, status, notes, created_by)
                VALUES (?, ?, ?, 'kg', 'ACTIVE', 'Ketetapan Bank Sampah Pusat', 'SYSTEM')
                """,
                (price_id, cat_id, cat["price"])
            )
            logger.info(f"Seeded category {cat['name']} with active price Rp {cat['price']}/kg")


if __name__ == "__main__":
    seed_database()
