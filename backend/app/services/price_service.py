import uuid
from datetime import date
from typing import Any, Dict, List, Optional, Tuple
from fastapi import HTTPException, status
from app.core.database import db
from app.schemas.price import PriceCreateRequest, PriceUpdateRequest


class PriceService:
    @classmethod
    def list_prices(
        cls,
        category_id: Optional[str] = None,
        status_filter: Optional[str] = None,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Tuple[List[Dict[str, Any]], int]:
        """List price master records with filtering and pagination."""
        query = """
            SELECT p.*, c.name as category_name
            FROM waste_price_masters p
            JOIN waste_categories c ON p.category_id = c.id
            WHERE 1=1
        """
        count_query = """
            SELECT COUNT(*) as total
            FROM waste_price_masters p
            JOIN waste_categories c ON p.category_id = c.id
            WHERE 1=1
        """
        params: List[Any] = []
        count_params: List[Any] = []

        if category_id:
            query += " AND p.category_id = ?"
            count_query += " AND p.category_id = ?"
            params.append(category_id)
            count_params.append(category_id)

        if status_filter:
            query += " AND p.status = ?"
            count_query += " AND p.status = ?"
            params.append(status_filter)
            count_params.append(status_filter)

        if search:
            pattern = f"%{search.strip()}%"
            clause = " AND (c.name LIKE ? OR p.group_name LIKE ? OR p.example_items LIKE ? OR p.price_code LIKE ? OR p.notes LIKE ?)"
            query += clause
            count_query += clause
            params.extend([pattern, pattern, pattern, pattern, pattern])
            count_params.extend([pattern, pattern, pattern, pattern, pattern])

        # Count total
        count_result = db.fetch_one(count_query, count_params)
        total_items = count_result["total"] if count_result else 0

        # Sort & Paginate: Status ACTIVE di paling atas, INACTIVE di bawah, diurutkan tanggal berlaku terbaru
        offset = (page - 1) * page_size
        query += " ORDER BY CASE WHEN UPPER(p.status) = 'ACTIVE' THEN 1 ELSE 2 END ASC, p.effective_date DESC, p.created_at DESC LIMIT ? OFFSET ?"
        params.extend([page_size, offset])

        items = db.fetch_all(query, params)
        return items, total_items

    @classmethod
    def get_price_by_id(cls, price_id: str) -> Dict[str, Any]:
        """Get price record by ID."""
        price = db.fetch_one(
            """
            SELECT p.*, c.name as category_name
            FROM waste_price_masters p
            JOIN waste_categories c ON p.category_id = c.id
            WHERE p.id = ?
            """,
            (price_id,)
        )
        if not price:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Master harga tidak ditemukan.",
            )
        return price

    @classmethod
    def get_active_price_by_category(cls, category_id: str) -> Dict[str, Any]:
        """Get the currently active price for a category."""
        price = db.fetch_one(
            """
            SELECT p.*, c.name as category_name
            FROM waste_price_masters p
            JOIN waste_categories c ON p.category_id = c.id
            WHERE p.category_id = ? AND p.status = 'ACTIVE' AND c.is_active = 1
            ORDER BY p.effective_date DESC, p.created_at DESC
            LIMIT 1
            """,
            (category_id,)
        )
        if not price:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Harga aktif untuk kategori sampah ini tidak ditemukan.",
            )
        return price

    @classmethod
    def create_price(cls, data: PriceCreateRequest, creator_id: Optional[str] = None) -> Dict[str, Any]:
        """Create new price master and automatically deactivate previous active price if status is ACTIVE."""
        # 1. Validate category exists and is active
        category = db.fetch_one("SELECT * FROM waste_categories WHERE id = ?", (data.category_id,))
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Kategori sampah tidak ditemukan.",
            )
        if not category.get("is_active", 1):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tidak dapat menetapkan harga untuk kategori yang nonaktif.",
            )

        price_id = str(uuid.uuid4())
        effective_date = data.effective_date or date.today().isoformat()
        status_val = data.status

        with db.connection() as conn:
            cursor = conn.cursor()

            # Insert new price
            cursor.execute(
                """
                INSERT INTO waste_price_masters (
                    id, category_id, price_per_kg, price_code, group_name, example_items, unit, effective_date, status, notes, created_by, updated_by
                ) VALUES (?, ?, ?, ?, ?, ?, 'kg', ?, ?, ?, ?, ?)
                """,
                (
                    price_id,
                    data.category_id,
                    data.price_per_kg,
                    data.price_code,
                    data.group_name,
                    data.example_items,
                    effective_date,
                    status_val,
                    data.notes,
                    creator_id or "ADMIN",
                    creator_id or "ADMIN"
                )
            )

            # Insert history record
            history_id = str(uuid.uuid4())
            cursor.execute(
                """
                INSERT INTO waste_price_histories (
                    id, price_id, category_id, price_per_kg, status, effective_date, action, notes, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, 'CREATE', ?, ?)
                """,
                (
                    history_id,
                    price_id,
                    data.category_id,
                    data.price_per_kg,
                    status_val,
                    effective_date,
                    data.notes,
                    creator_id or "ADMIN"
                )
            )

        return cls.get_price_by_id(price_id)

    @classmethod
    def update_price(
        cls, price_id: str, data: PriceUpdateRequest, updater_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Update price master record."""
        existing = cls.get_price_by_id(price_id)

        category_id = data.category_id if data.category_id is not None else existing["category_id"]
        if data.category_id is not None and data.category_id != existing["category_id"]:
            cat = db.fetch_one("SELECT * FROM waste_categories WHERE id = ?", (data.category_id,))
            if not cat:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Kategori sampah tujuan tidak ditemukan.",
                )

        price_per_kg = data.price_per_kg if data.price_per_kg is not None else existing["price_per_kg"]
        price_code = data.price_code if data.price_code is not None else existing.get("price_code")
        group_name = data.group_name if data.group_name is not None else existing.get("group_name")
        example_items = data.example_items if data.example_items is not None else existing.get("example_items")
        effective_date = data.effective_date if data.effective_date is not None else existing["effective_date"]
        status_val = data.status if data.status is not None else existing["status"]
        notes = data.notes if data.notes is not None else existing["notes"]

        with db.connection() as conn:
            cursor = conn.cursor()

            cursor.execute(
                """
                UPDATE waste_price_masters
                SET category_id = ?, price_per_kg = ?, price_code = ?, group_name = ?, example_items = ?, effective_date = ?, status = ?, notes = ?, updated_by = ?, updated_at = datetime('now')
                WHERE id = ?
                """,
                (category_id, price_per_kg, price_code, group_name, example_items, effective_date, status_val, notes, updater_id or "ADMIN", price_id)
            )

            # Insert history
            history_id = str(uuid.uuid4())
            cursor.execute(
                """
                INSERT INTO waste_price_histories (
                    id, price_id, category_id, price_per_kg, status, effective_date, action, notes, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, 'UPDATE', ?, ?)
                """,
                (
                    history_id,
                    price_id,
                    category_id,
                    price_per_kg,
                    status_val,
                    effective_date,
                    notes,
                    updater_id or "ADMIN"
                )
            )

        return cls.get_price_by_id(price_id)

    @classmethod
    def update_price_status(
        cls, price_id: str, status_val: str, updater_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Activate or deactivate a price."""
        existing = cls.get_price_by_id(price_id)
        return cls.update_price(
            price_id,
            PriceUpdateRequest(status=status_val),
            updater_id=updater_id
        )

    @classmethod
    def delete_price(cls, price_id: str) -> None:
        """Hard delete a price and its history."""
        # 1. Check if price exists
        cls.get_price_by_id(price_id)
        
        # 2. Delete from history first (foreign key dependency)
        with db.connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM waste_price_histories WHERE price_id = ?", (price_id,))
            cursor.execute("DELETE FROM waste_price_masters WHERE id = ?", (price_id,))


price_service = PriceService()
