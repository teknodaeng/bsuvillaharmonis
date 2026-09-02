import uuid
from typing import Any, Dict, List, Optional, Tuple
from fastapi import HTTPException, status
from app.core.database import db
from app.schemas.category import CategoryCreateRequest, CategoryUpdateRequest


class CategoryService:
    @classmethod
    def list_categories(
        cls,
        active_only: bool = False,
        search: Optional[str] = None,
        has_active_price: bool = False,
    ) -> List[Dict[str, Any]]:
        """List waste categories with their active price."""
        query = "SELECT * FROM waste_categories WHERE 1=1"
        params: List[Any] = []

        if active_only:
            query += " AND is_active = 1"
        if search:
            query += " AND (name LIKE ? OR description LIKE ?)"
            pattern = f"%{search.strip()}%"
            params.extend([pattern, pattern])

        query += " ORDER BY is_active DESC, name ASC"
        categories = db.fetch_all(query, params)

        # Attach active price for each category
        result = []
        for cat in categories:
            cat["is_active"] = bool(cat.get("is_active", 1))
            active_price = db.fetch_one(
                """
                SELECT * FROM waste_price_masters
                WHERE category_id = ? AND status = 'ACTIVE'
                ORDER BY effective_date DESC, created_at DESC
                LIMIT 1
                """,
                (cat["id"],)
            )
            cat["active_price"] = active_price
            if has_active_price:
                if active_price and active_price.get("status") == "ACTIVE" and (active_price.get("price_per_kg") or 0) > 0:
                    result.append(cat)
            else:
                result.append(cat)

        return result

    @classmethod
    def list_categories_paginated(
        cls,
        active_only: bool = False,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Tuple[List[Dict[str, Any]], int]:
        """List waste categories with filtering and pagination."""
        query = "SELECT * FROM waste_categories WHERE 1=1"
        count_query = "SELECT COUNT(*) as total FROM waste_categories WHERE 1=1"
        params: List[Any] = []
        count_params: List[Any] = []

        if active_only:
            query += " AND is_active = 1"
            count_query += " AND is_active = 1"
        if search:
            clause = " AND (name LIKE ? OR description LIKE ?)"
            pattern = f"%{search.strip()}%"
            query += clause
            count_query += clause
            params.extend([pattern, pattern])
            count_params.extend([pattern, pattern])

        # Count total
        count_result = db.fetch_one(count_query, count_params)
        total_items = count_result["total"] if count_result else 0

        # Sort & Paginate: status aktif di atas, nonaktif di bawah, lalu nama A-Z
        offset = (page - 1) * page_size
        query += " ORDER BY is_active DESC, name ASC LIMIT ? OFFSET ?"
        params.extend([page_size, offset])

        categories = db.fetch_all(query, params)

        # Attach active price for each category
        for cat in categories:
            cat["is_active"] = bool(cat.get("is_active", 1))
            active_price = db.fetch_one(
                """
                SELECT * FROM waste_price_masters
                WHERE category_id = ? AND status = 'ACTIVE'
                ORDER BY effective_date DESC, created_at DESC
                LIMIT 1
                """,
                (cat["id"],)
            )
            cat["active_price"] = active_price

        return categories, total_items

    @classmethod
    def get_category_by_id(cls, category_id: str) -> Dict[str, Any]:
        """Get category by ID."""
        cat = db.fetch_one("SELECT * FROM waste_categories WHERE id = ?", (category_id,))
        if not cat:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Kategori sampah tidak ditemukan.",
            )
        cat["is_active"] = bool(cat.get("is_active", 1))
        return cat

    @classmethod
    def create_category(cls, data: CategoryCreateRequest, creator_id: Optional[str] = None) -> Dict[str, Any]:
        """Create new waste category."""
        existing = db.fetch_one("SELECT id FROM waste_categories WHERE LOWER(name) = LOWER(?)", (data.name.strip(),))
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Kategori sampah dengan nama '{data.name.strip()}' sudah ada.",
            )
        
        cat_id = str(uuid.uuid4())
        db.execute(
            """
            INSERT INTO waste_categories (id, name, description, is_active, created_by, updated_by)
            VALUES (?, ?, ?, 1, ?, ?)
            """,
            (cat_id, data.name.strip(), data.description, creator_id or "ADMIN", creator_id or "ADMIN")
        )
        return cls.get_category_by_id(cat_id)

    @classmethod
    def update_category(
        cls, category_id: str, data: CategoryUpdateRequest, updater_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Update category information."""
        existing = cls.get_category_by_id(category_id)
        
        name = data.name.strip() if data.name is not None else existing["name"]
        description = data.description if data.description is not None else existing["description"]
        is_active = 1 if (data.is_active if data.is_active is not None else bool(existing["is_active"])) else 0

        if data.name is not None and data.name.strip().lower() != existing["name"].lower():
            name_exist = db.fetch_one(
                "SELECT id FROM waste_categories WHERE LOWER(name) = LOWER(?) AND id != ?",
                (data.name.strip(), category_id)
            )
            if name_exist:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Kategori sampah dengan nama '{data.name.strip()}' sudah ada.",
                )

        db.execute(
            """
            UPDATE waste_categories
            SET name = ?, description = ?, is_active = ?, updated_by = ?, updated_at = datetime('now')
            WHERE id = ?
            """,
            (name, description, is_active, updater_id or "ADMIN", category_id)
        )
        return cls.get_category_by_id(category_id)

    @classmethod
    def update_category_status(
        cls, category_id: str, is_active: bool, updater_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Activate or deactivate a waste category."""
        cls.get_category_by_id(category_id)
        db.execute(
            """
            UPDATE waste_categories
            SET is_active = ?, updated_by = ?, updated_at = datetime('now')
            WHERE id = ?
            """,
            (1 if is_active else 0, updater_id or "ADMIN", category_id)
        )
        return cls.get_category_by_id(category_id)

    @classmethod
    def delete_category(cls, category_id: str) -> None:
        """Hard delete a category if it is not used in transactions or prices."""
        # 1. Check if category exists
        cls.get_category_by_id(category_id)
        
        # 2. Check usage in transactions
        trx = db.fetch_one("SELECT id FROM transactions WHERE category_id = ? LIMIT 1", (category_id,))
        if trx:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Kategori tidak dapat dihapus karena sudah memiliki riwayat transaksi.",
            )
            
        # 3. Check usage in waste_price_masters
        price = db.fetch_one("SELECT id FROM waste_price_masters WHERE category_id = ? LIMIT 1", (category_id,))
        if price:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Kategori tidak dapat dihapus karena sudah memiliki riwayat harga sampah.",
            )
            
        # 4. Safe to delete
        db.execute("DELETE FROM waste_categories WHERE id = ?", (category_id,))


category_service = CategoryService()
