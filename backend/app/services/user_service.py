import uuid
from typing import Any, Dict, List, Optional, Tuple
from fastapi import HTTPException, status
from app.core.database import db
from app.core.security import get_password_hash
from app.schemas.user import (
    UserCreateRequest,
    UserUpdateRequest,
)
from app.services.nasabah_service import nasabah_service


class UserService:
    @classmethod
    def get_user_by_id(cls, user_id: str) -> Dict[str, Any]:
        """Fetch user by UUID with joined nasabah data if role is NASABAH."""
        user = db.fetch_one("SELECT * FROM users WHERE id = ?", (user_id,))
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Pengguna tidak ditemukan.",
            )

        user_dict = dict(user)
        user_dict["is_active"] = bool(user_dict.get("is_active", 1))
        user_dict["status"] = user_dict.get("status") or ("ACTIVE" if user_dict["is_active"] else "INACTIVE")

        if user_dict.get("nasabah_id"):
            nasabah = db.fetch_one("SELECT * FROM nasabah WHERE id = ?", (user_dict["nasabah_id"],))
            if nasabah:
                nasabah_dict = dict(nasabah)
                nasabah_dict["balance"] = nasabah_service.get_nasabah_balance(nasabah_dict["id"])
                user_dict["nasabah"] = nasabah_dict
            else:
                user_dict["nasabah"] = None
        else:
            user_dict["nasabah"] = None

        return user_dict

    @classmethod
    def list_users(
        cls,
        search: Optional[str] = None,
        role_filter: Optional[str] = None,
        status_filter: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[Dict[str, Any]], int]:
        """List users with search across username, name, email, phone, and NIK, plus role & status filters."""
        query = """
            SELECT u.*, 
                   n.customer_id as nasabah_customer_id,
                   n.account_no as nasabah_account_no,
                   n.nik as nasabah_nik,
                   n.address as nasabah_address,
                   n.rt as nasabah_rt,
                   n.rw as nasabah_rw,
                   n.kelurahan as nasabah_kelurahan,
                   n.kecamatan as nasabah_kecamatan,
                   n.kabupaten_kota as nasabah_kabupaten_kota,
                   n.nasabah_category as nasabah_category_val
            FROM users u
            LEFT JOIN nasabah n ON u.nasabah_id = n.id
            WHERE 1=1
        """
        count_query = """
            SELECT COUNT(*) as total
            FROM users u
            LEFT JOIN nasabah n ON u.nasabah_id = n.id
            WHERE 1=1
        """
        params: List[Any] = []
        count_params: List[Any] = []

        if search:
            q = f"%{search.strip()}%"
            search_clause = """
                AND (
                    u.username LIKE ? 
                    OR u.name LIKE ? 
                    OR u.email LIKE ? 
                    OR u.phone LIKE ?
                    OR n.name LIKE ?
                    OR n.nik LIKE ?
                    OR n.customer_id LIKE ?
                    OR n.kelurahan LIKE ?
                    OR n.kecamatan LIKE ?
                )
            """
            query += search_clause
            count_query += search_clause
            params.extend([q, q, q, q, q, q, q, q, q])
            count_params.extend([q, q, q, q, q, q, q, q, q])

        if role_filter and role_filter.upper() in ["ADMIN", "NASABAH"]:
            query += " AND u.role = ?"
            count_query += " AND u.role = ?"
            params.append(role_filter.upper())
            count_params.append(role_filter.upper())

        if status_filter and status_filter.upper() in ["ACTIVE", "INACTIVE"]:
            query += " AND (u.status = ? OR (u.status IS NULL AND u.is_active = ?))"
            count_query += " AND (u.status = ? OR (u.status IS NULL AND u.is_active = ?))"
            is_act = 1 if status_filter.upper() == "ACTIVE" else 0
            params.extend([status_filter.upper(), is_act])
            count_params.extend([status_filter.upper(), is_act])

        # Count total
        count_res = db.fetch_one(count_query, count_params)
        total_items = count_res["total"] if count_res else 0

        # Pagination & sorting (Admins first, then newest)
        offset = (page - 1) * page_size
        query += " ORDER BY CASE WHEN u.role = 'ADMIN' THEN 0 ELSE 1 END, u.created_at DESC LIMIT ? OFFSET ?"
        params.extend([page_size, offset])

        rows = db.fetch_all(query, params)
        items = []
        for r in rows:
            u_dict = dict(r)
            u_dict["is_active"] = bool(u_dict.get("is_active", 1))
            u_dict["status"] = u_dict.get("status") or ("ACTIVE" if u_dict["is_active"] else "INACTIVE")

            if u_dict.get("nasabah_id"):
                nasabah_obj = {
                    "id": u_dict["nasabah_id"],
                    "customer_id": u_dict.get("nasabah_customer_id") or u_dict["username"],
                    "account_no": u_dict.get("nasabah_account_no") or u_dict["username"],
                    "nik": u_dict.get("nasabah_nik") or "-",
                    "name": u_dict.get("name") or "",
                    "phone": u_dict.get("phone") or "",
                    "address": u_dict.get("nasabah_address") or "",
                    "rt": u_dict.get("nasabah_rt"),
                    "rw": u_dict.get("nasabah_rw"),
                    "kelurahan": u_dict.get("nasabah_kelurahan"),
                    "kecamatan": u_dict.get("nasabah_kecamatan"),
                    "kabupaten_kota": u_dict.get("nasabah_kabupaten_kota"),
                    "nasabah_category": u_dict.get("nasabah_category_val") or "Rumah Tangga/Individu",
                    "email": u_dict.get("email"),
                    "status": u_dict["status"],
                    "balance": nasabah_service.get_nasabah_balance(u_dict["nasabah_id"]),
                }
                u_dict["nasabah"] = nasabah_obj
            else:
                u_dict["nasabah"] = None

            items.append(u_dict)

        return items, total_items

    @classmethod
    def create_user(cls, data: UserCreateRequest, creator_id: Optional[str] = None) -> Dict[str, Any]:
        """Create new User (Admin / Petugas or Nasabah account)."""
        clean_username = data.username.strip().lower()

        # 1. Check if username already exists
        existing_username = db.fetch_one("SELECT id FROM users WHERE LOWER(username) = ?", (clean_username,))
        if existing_username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Username '{data.username}' sudah digunakan.",
            )

        user_id = str(uuid.uuid4())
        hashed_password = get_password_hash(data.password)
        is_active = 1 if data.status == "ACTIVE" else 0

        db.execute(
            """
            INSERT INTO users (
                id, username, name, email, phone, password_hash, role, nasabah_id, status, is_active, created_by, updated_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?)
            """,
            (
                user_id,
                clean_username,
                data.name.strip(),
                data.email,
                data.phone,
                hashed_password,
                data.role,
                data.status,
                is_active,
                creator_id or "ADMIN",
                creator_id or "ADMIN",
            ),
        )

        return cls.get_user_by_id(user_id)

    @classmethod
    def update_user(cls, user_id: str, data: UserUpdateRequest, updater_id: Optional[str] = None) -> Dict[str, Any]:
        """Update user profile info and sync linked nasabah if applicable."""
        existing = db.fetch_one("SELECT * FROM users WHERE id = ?", (user_id,))
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Pengguna tidak ditemukan.",
            )

        username = data.username.strip().lower() if data.username is not None else existing["username"]
        if username != existing["username"]:
            dup = db.fetch_one("SELECT id FROM users WHERE LOWER(username) = ? AND id != ?", (username, user_id))
            if dup:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Username '{username}' sudah digunakan oleh pengguna lain.",
                )

        name = data.name.strip() if data.name is not None else existing["name"]
        email = data.email if data.email is not None else existing["email"]
        phone = data.phone if data.phone is not None else existing["phone"]
        role = data.role if data.role is not None else existing["role"]
        status_val = data.status if data.status is not None else (existing.get("status") or "ACTIVE")
        is_active = 1 if status_val == "ACTIVE" else 0

        with db.connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                UPDATE users
                SET username = ?, name = ?, email = ?, phone = ?, role = ?, status = ?, is_active = ?, updated_by = ?, updated_at = datetime('now')
                WHERE id = ?
                """,
                (username, name, email, phone, role, status_val, is_active, updater_id or "ADMIN", user_id),
            )

            # Sync to nasabah if linked
            if existing.get("nasabah_id"):
                cursor.execute(
                    """
                    UPDATE nasabah
                    SET name = ?, email = ?, phone = ?, status = ?, updated_by = ?, updated_at = datetime('now')
                    WHERE id = ?
                    """,
                    (name, email, phone, status_val, updater_id or "ADMIN", existing["nasabah_id"]),
                )

        return cls.get_user_by_id(user_id)

    @classmethod
    def toggle_user_status(cls, user_id: str, status_val: str, updater_id: Optional[str] = None) -> Dict[str, Any]:
        """Activate or inactivate a user and their linked nasabah record."""
        existing = db.fetch_one("SELECT * FROM users WHERE id = ?", (user_id,))
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Pengguna tidak ditemukan.",
            )

        is_active = 1 if status_val == "ACTIVE" else 0

        with db.connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                UPDATE users
                SET status = ?, is_active = ?, updated_by = ?, updated_at = datetime('now')
                WHERE id = ?
                """,
                (status_val, is_active, updater_id or "ADMIN", user_id),
            )

            if existing.get("nasabah_id"):
                cursor.execute(
                    """
                    UPDATE nasabah
                    SET status = ?, updated_by = ?, updated_at = datetime('now')
                    WHERE id = ?
                    """,
                    (status_val, updater_id or "ADMIN", existing["nasabah_id"]),
                )

        return cls.get_user_by_id(user_id)

    @classmethod
    def reset_user_password(cls, user_id: str, new_password: str, updater_id: Optional[str] = None) -> Dict[str, Any]:
        """Reset a user's password directly by admin."""
        existing = db.fetch_one("SELECT * FROM users WHERE id = ?", (user_id,))
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Pengguna tidak ditemukan.",
            )

        hashed_password = get_password_hash(new_password)
        db.execute(
            """
            UPDATE users
            SET password_hash = ?, updated_by = ?, updated_at = datetime('now')
            WHERE id = ?
            """,
            (hashed_password, updater_id or "ADMIN", user_id),
        )

        return {"message": "Kata sandi pengguna berhasil direset."}


user_service = UserService()
