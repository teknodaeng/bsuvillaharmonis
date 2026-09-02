import uuid
from typing import Any, Dict, List, Optional, Tuple
from fastapi import HTTPException, status
from app.core.database import db
from app.core.security import get_password_hash
from app.schemas.nasabah import (
    NasabahCreateRequest,
    NasabahResponse,
    NasabahStatusUpdateRequest,
    NasabahUpdateRequest,
)


class NasabahService:
    @staticmethod
    def generate_next_account_number(conn) -> str:
        """Atomic account sequence increment returning bsuvh0000 to bsuvh9999."""
        cursor = conn.cursor()
        cursor.execute("SELECT last_number FROM account_sequences WHERE id = 1")
        row = cursor.fetchone()
        if not row:
            cursor.execute("INSERT INTO account_sequences (id, last_number) VALUES (1, -1)")
            last_number = -1
        else:
            last_number = row[0] if isinstance(row, (tuple, list)) else row["last_number"]
        
        next_number = last_number + 1
        if next_number > 9999:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Kapasitas nomor rekening bsuvh0000-bsuvh9999 telah habis. Silakan hubungi pengembang sistem.",
            )
        
        cursor.execute("UPDATE account_sequences SET last_number = ? WHERE id = 1", (next_number,))
        return f"bsuvh{next_number:04d}"

    @staticmethod
    def get_nasabah_balance(nasabah_id: str) -> int:
        """Calculate or fetch the latest balance of a nasabah."""
        latest_trx = db.fetch_one(
            """
            SELECT balance_after FROM transactions
            WHERE nasabah_id = ?
            ORDER BY transaction_date DESC, created_at DESC
            LIMIT 1
            """,
            (nasabah_id,)
        )
        if latest_trx:
            return latest_trx["balance_after"]
        return 0

    @classmethod
    def create_nasabah(
        cls,
        data: NasabahCreateRequest,
        registration_source: str = "SELF",
        creator_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create new nasabah and associated user credentials."""
        # 1. Check if NIK already exists
        existing_nik = db.fetch_one("SELECT id FROM nasabah WHERE nik = ?", (data.nik,))
        if existing_nik:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="NIK sudah terdaftar dalam sistem.",
            )

        nasabah_id = str(uuid.uuid4())
        user_id = str(uuid.uuid4())
        hashed_password = get_password_hash(data.password)

        with db.connection() as conn:
            # Generate account number
            account_no = cls.generate_next_account_number(conn)
            
            # Insert nasabah record
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO nasabah (
                    id, customer_id, account_no, nik, name, phone, address,
                    rt, rw, kelurahan, kecamatan, kabupaten_kota, nasabah_category, email,
                    status, registration_source, created_by, updated_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?)
                """,
                (
                    nasabah_id,
                    account_no,
                    account_no,
                    data.nik,
                    data.name,
                    data.phone,
                    data.address,
                    getattr(data, "rt", None),
                    getattr(data, "rw", None),
                    getattr(data, "kelurahan", None),
                    getattr(data, "kecamatan", None),
                    getattr(data, "kabupaten_kota", None),
                    getattr(data, "nasabah_category", None) or "Rumah Tangga/Individu",
                    data.email,
                    registration_source,
                    creator_id or "SYSTEM",
                    creator_id or "SYSTEM"
                )
            )

            # Insert login user record
            cursor.execute(
                """
                INSERT INTO users (
                    id, username, name, email, phone, password_hash, role, nasabah_id, status, is_active, created_by, updated_by
                ) VALUES (?, ?, ?, ?, ?, ?, 'NASABAH', ?, 'ACTIVE', 1, ?, ?)
                """,
                (user_id, account_no, data.name, data.email, data.phone, hashed_password, nasabah_id, creator_id or "SYSTEM", creator_id or "SYSTEM")
            )

        nasabah = db.fetch_one("SELECT * FROM nasabah WHERE id = ?", (nasabah_id,))
        nasabah["balance"] = 0
        return nasabah

    @classmethod
    def list_nasabah(
        cls,
        search: Optional[str] = None,
        status_filter: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Tuple[List[Dict[str, Any]], int]:
        """List nasabah with search, filter, and pagination."""
        query = "SELECT * FROM nasabah WHERE 1=1"
        count_query = "SELECT COUNT(*) as total FROM nasabah WHERE 1=1"
        params: List[Any] = []
        count_params: List[Any] = []

        if search:
            search_pattern = f"%{search.strip()}%"
            filter_clause = " AND (name LIKE ? OR nik LIKE ? OR customer_id LIKE ? OR phone LIKE ? OR kelurahan LIKE ? OR kecamatan LIKE ? OR nasabah_category LIKE ?)"
            query += filter_clause
            count_query += filter_clause
            params.extend([search_pattern, search_pattern, search_pattern, search_pattern, search_pattern, search_pattern, search_pattern])
            count_params.extend([search_pattern, search_pattern, search_pattern, search_pattern, search_pattern, search_pattern, search_pattern])

        if status_filter:
            query += " AND status = ?"
            count_query += " AND status = ?"
            params.append(status_filter)
            count_params.append(status_filter)

        # Count total
        count_result = db.fetch_one(count_query, count_params)
        total_items = count_result["total"] if count_result else 0

        # Pagination & sorting
        offset = (page - 1) * page_size
        query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
        params.extend([page_size, offset])

        items = db.fetch_all(query, params)
        for item in items:
            item["balance"] = cls.get_nasabah_balance(item["id"])

        return items, total_items

    @classmethod
    def get_nasabah_by_id(cls, nasabah_id: str) -> Dict[str, Any]:
        """Get nasabah details by UUID."""
        nasabah = db.fetch_one("SELECT * FROM nasabah WHERE id = ?", (nasabah_id,))
        if not nasabah:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Nasabah tidak ditemukan.",
            )
        nasabah["balance"] = cls.get_nasabah_balance(nasabah_id)
        return nasabah

    @classmethod
    def update_nasabah(
        cls,
        nasabah_id: str,
        data: NasabahUpdateRequest,
        updater_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Update nasabah profile details and sync user login record."""
        existing = db.fetch_one("SELECT * FROM nasabah WHERE id = ?", (nasabah_id,))
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Nasabah tidak ditemukan.",
            )

        nik = data.nik if data.nik is not None else existing["nik"]
        if data.nik is not None and data.nik != existing["nik"]:
            dup_nik = db.fetch_one(
                "SELECT id FROM nasabah WHERE nik = ? AND id != ?",
                (data.nik, nasabah_id)
            )
            if dup_nik:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"NIK {data.nik} sudah terdaftar pada nasabah lain.",
                )

        name = data.name if data.name is not None else existing["name"]
        phone = data.phone if data.phone is not None else existing["phone"]
        address = data.address if data.address is not None else existing["address"]
        rt = data.rt if data.rt is not None else existing.get("rt")
        rw = data.rw if data.rw is not None else existing.get("rw")
        kelurahan = data.kelurahan if data.kelurahan is not None else existing.get("kelurahan")
        kecamatan = data.kecamatan if data.kecamatan is not None else existing.get("kecamatan")
        kabupaten_kota = data.kabupaten_kota if data.kabupaten_kota is not None else existing.get("kabupaten_kota")
        nasabah_category = data.nasabah_category if data.nasabah_category is not None else existing.get("nasabah_category", "Rumah Tangga/Individu")
        email = data.email if data.email is not None else existing["email"]

        with db.connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                UPDATE nasabah
                SET nik = ?, name = ?, phone = ?, address = ?, rt = ?, rw = ?, kelurahan = ?, kecamatan = ?, kabupaten_kota = ?, nasabah_category = ?, email = ?, updated_by = ?, updated_at = datetime('now')
                WHERE id = ?
                """,
                (nik, name, phone, address, rt, rw, kelurahan, kecamatan, kabupaten_kota, nasabah_category, email, updater_id or "ADMIN", nasabah_id)
            )
            cursor.execute(
                """
                UPDATE users
                SET name = ?, phone = ?, email = ?, updated_by = ?, updated_at = datetime('now')
                WHERE nasabah_id = ?
                """,
                (name, phone, email, updater_id or "ADMIN", nasabah_id)
            )

        return cls.get_nasabah_by_id(nasabah_id)

    @classmethod
    def update_nasabah_status(
        cls,
        nasabah_id: str,
        status_val: str,
        updater_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Activate or inactivate a nasabah and their associated login account."""
        existing = db.fetch_one("SELECT * FROM nasabah WHERE id = ?", (nasabah_id,))
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Nasabah tidak ditemukan.",
            )

        is_active = 1 if status_val == "ACTIVE" else 0

        with db.connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                UPDATE nasabah
                SET status = ?, updated_by = ?, updated_at = datetime('now')
                WHERE id = ?
                """,
                (status_val, updater_id or "ADMIN", nasabah_id)
            )
            cursor.execute(
                """
                UPDATE users
                SET status = ?, is_active = ?, updated_by = ?, updated_at = datetime('now')
                WHERE nasabah_id = ?
                """,
                (status_val, is_active, updater_id or "ADMIN", nasabah_id)
            )

        return cls.get_nasabah_by_id(nasabah_id)


nasabah_service = NasabahService()
