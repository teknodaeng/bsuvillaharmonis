import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from fastapi import HTTPException, status
from app.core.database import db
from app.schemas.transaction import TransactionCreateRequest
from app.services.nasabah_service import nasabah_service
from app.services.price_service import price_service


class TransactionService:
    @classmethod
    def generate_transaction_no(cls, conn, tx_date_str: str) -> str:
        """Generate unique transaction number format TRX-YYYYMMDD-XXXX."""
        try:
            parsed = datetime.fromisoformat(tx_date_str)
        except Exception:
            parsed = datetime.now(timezone.utc)
        
        date_prefix = parsed.strftime("%Y%m%d")
        search_pattern = f"TRX-{date_prefix}-%"

        cursor = conn.cursor()
        cursor.execute(
            "SELECT transaction_no FROM transactions WHERE transaction_no LIKE ? ORDER BY transaction_no DESC LIMIT 1",
            (search_pattern,)
        )
        row = cursor.fetchone()
        if not row:
            next_num = 1
        else:
            last_no = row[0] if isinstance(row, (tuple, list)) else row["transaction_no"]
            parts = last_no.split("-")
            if len(parts) >= 3 and parts[-1].isdigit():
                next_num = int(parts[-1]) + 1
            else:
                next_num = 1

        return f"TRX-{date_prefix}-{next_num:04d}"

    @classmethod
    def get_transaction_by_id(cls, transaction_id: str) -> Dict[str, Any]:
        """Fetch transaction with joined category, price master group, and nasabah details."""
        tx = db.fetch_one(
            """
            SELECT t.*, 
                   n.customer_id as nasabah_customer_id, 
                   n.name as nasabah_name, 
                   n.nik as nasabah_nik,
                   n.phone as nasabah_phone,
                   n.address as nasabah_address,
                   c.name as category_name,
                   p.group_name as price_group_name,
                   p.price_code as price_code,
                   p.example_items as price_example_items
            FROM transactions t
            JOIN nasabah n ON t.nasabah_id = n.id
            LEFT JOIN waste_categories c ON t.category_id = c.id
            LEFT JOIN waste_price_masters p ON t.price_id = p.id
            WHERE t.id = ?
            """,
            (transaction_id,)
        )
        if not tx:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transaksi tidak ditemukan.",
            )
        
        # Structure category sub-object with exact group and category name
        if tx.get("category_id") or tx.get("price_id"):
            group_name = tx.get("price_group_name")
            cat_name = tx.get("category_name") or "Sampah"
            display_name = f"[{group_name}] {cat_name}" if group_name else cat_name
            tx["category"] = {
                "id": tx.get("category_id") or "",
                "name": display_name,
                "group_name": group_name,
                "price_code": tx.get("price_code"),
            }
        else:
            tx["category"] = None

        if tx.get("weight_gram") is not None:
            tx["weight_kg"] = tx["weight_gram"] / 1000.0
        else:
            tx["weight_kg"] = None

        return tx

    @classmethod
    def create_transaction(
        cls, data: TransactionCreateRequest, creator_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Process and record a new SETOR or TARIK transaction with exact price master linkage."""
        # 1. Check idempotency key if provided
        if data.idempotency_key:
            existing_tx = db.fetch_one(
                "SELECT id FROM transactions WHERE idempotency_key = ?",
                (data.idempotency_key,)
            )
            if existing_tx:
                return cls.get_transaction_by_id(existing_tx["id"])

        # 2. Validate nasabah
        nasabah = db.fetch_one("SELECT * FROM nasabah WHERE id = ?", (data.nasabah_id,))
        if not nasabah:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Nasabah tidak ditemukan.",
            )
        if nasabah.get("status") != "ACTIVE":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Transaksi ditolak. Status nasabah nonaktif.",
            )

        tx_date = data.transaction_date or datetime.now().isoformat()
        current_balance = nasabah_service.get_nasabah_balance(data.nasabah_id)

        tx_id = str(uuid.uuid4())
        category_id = None
        price_id = None
        weight_gram = None
        price_per_kg = None

        if data.type == "SETOR":
            if data.price_id:
                price_rec = price_service.get_price_by_id(data.price_id)
                if price_rec.get("status") != "ACTIVE":
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Master harga sampah yang dipilih sedang tidak aktif.",
                    )
                price_per_kg = price_rec["price_per_kg"]
                category_id = price_rec["category_id"]
                price_id = price_rec["id"]
            elif data.category_id:
                active_price = price_service.get_active_price_by_category(data.category_id)
                price_per_kg = active_price["price_per_kg"]
                category_id = data.category_id
                price_id = active_price["id"]
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Kelompok sampah atau harga sampah wajib dipilih untuk transaksi SETOR.",
                )

            weight_gram = int(round(data.weight_kg * 1000))
            amount = int(round(data.weight_kg * price_per_kg))
            credit = amount
            debit = 0
            balance_after = current_balance + credit
        elif data.type == "TARIK":
            amount = data.amount
            debit = amount
            credit = 0
            if current_balance < debit:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Saldo tidak mencukupi. Saldo saat ini: Rp {current_balance:,}".replace(",", "."),
                )
            balance_after = current_balance - debit
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Jenis transaksi tidak valid.",
            )

        with db.connection() as conn:
            tx_no = cls.generate_transaction_no(conn, tx_date)
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO transactions (
                    id, transaction_no, nasabah_id, transaction_date, type, category_id, price_id,
                    weight_gram, price_per_kg, amount, debit, credit, balance_after,
                    notes, idempotency_key, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    tx_id,
                    tx_no,
                    data.nasabah_id,
                    tx_date,
                    data.type,
                    category_id,
                    price_id,
                    weight_gram,
                    price_per_kg,
                    amount,
                    debit,
                    credit,
                    balance_after,
                    data.notes,
                    data.idempotency_key,
                    creator_id or "ADMIN"
                )
            )

        return cls.get_transaction_by_id(tx_id)

    @classmethod
    def list_transactions(
        cls,
        nasabah_id: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        type_filter: Optional[str] = None,
        category_id: Optional[str] = None,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Tuple[List[Dict[str, Any]], int]:
        """List transactions with multiple filtering options, price group, and pagination."""
        query = """
            SELECT t.*, 
                   n.customer_id as nasabah_customer_id, 
                   n.name as nasabah_name, 
                   n.nik as nasabah_nik,
                   c.name as category_name,
                   p.group_name as price_group_name,
                   p.price_code as price_code
            FROM transactions t
            JOIN nasabah n ON t.nasabah_id = n.id
            LEFT JOIN waste_categories c ON t.category_id = c.id
            LEFT JOIN waste_price_masters p ON t.price_id = p.id
            WHERE 1=1
        """
        count_query = """
            SELECT COUNT(*) as total
            FROM transactions t
            JOIN nasabah n ON t.nasabah_id = n.id
            LEFT JOIN waste_categories c ON t.category_id = c.id
            LEFT JOIN waste_price_masters p ON t.price_id = p.id
            WHERE 1=1
        """
        params: List[Any] = []
        count_params: List[Any] = []

        if nasabah_id:
            query += " AND t.nasabah_id = ?"
            count_query += " AND t.nasabah_id = ?"
            params.append(nasabah_id)
            count_params.append(nasabah_id)

        if start_date:
            query += " AND date(t.transaction_date) >= date(?)"
            count_query += " AND date(t.transaction_date) >= date(?)"
            params.append(start_date)
            count_params.append(start_date)

        if end_date:
            query += " AND date(t.transaction_date) <= date(?)"
            count_query += " AND date(t.transaction_date) <= date(?)"
            params.append(end_date)
            count_params.append(end_date)

        if type_filter:
            query += " AND t.type = ?"
            count_query += " AND t.type = ?"
            params.append(type_filter)
            count_params.append(type_filter)

        if category_id:
            query += " AND t.category_id = ?"
            count_query += " AND t.category_id = ?"
            params.append(category_id)
            count_params.append(category_id)

        if search:
            pattern = f"%{search.strip()}%"
            clause = " AND (t.transaction_no LIKE ? OR n.name LIKE ? OR n.customer_id LIKE ? OR n.nik LIKE ? OR p.group_name LIKE ? OR c.name LIKE ?)"
            query += clause
            count_query += clause
            params.extend([pattern, pattern, pattern, pattern, pattern, pattern])
            count_params.extend([pattern, pattern, pattern, pattern, pattern, pattern])

        # Count total
        count_res = db.fetch_one(count_query, count_params)
        total_items = count_res["total"] if count_res else 0

        # Sort & Paginate
        offset = (page - 1) * page_size
        query += " ORDER BY t.transaction_date DESC, t.created_at DESC LIMIT ? OFFSET ?"
        params.extend([page_size, offset])

        items = db.fetch_all(query, params)
        for item in items:
            group_name = item.get("price_group_name")
            cat_name = item.get("category_name") or "Sampah"
            display_name = f"[{group_name}] {cat_name}" if group_name else cat_name
            if item.get("category_id") or item.get("price_id"):
                item["category"] = {
                    "id": item.get("category_id") or "",
                    "name": display_name,
                    "group_name": group_name,
                    "price_code": item.get("price_code"),
                }
            else:
                item["category"] = None

            if item.get("weight_gram") is not None:
                item["weight_kg"] = item["weight_gram"] / 1000.0
            else:
                item["weight_kg"] = None

        return items, total_items


transaction_service = TransactionService()
