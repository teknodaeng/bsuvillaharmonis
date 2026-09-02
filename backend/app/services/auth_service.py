from datetime import datetime, timezone
from typing import Any, Dict
from fastapi import HTTPException, status
from app.core.database import db
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_password_hash,
    verify_password,
)
from app.schemas.auth import (
    ChangePasswordRequest,
    LoginRequest,
    RegisterRequest,
)
from app.services.nasabah_service import nasabah_service


class AuthService:
    @classmethod
    def register(cls, data: RegisterRequest) -> Dict[str, Any]:
        """Self-registration of prospective nasabah."""
        nasabah = nasabah_service.create_nasabah(data, registration_source="SELF")
        return {"nasabah": nasabah}

    @classmethod
    def find_user_by_identifier(cls, identifier: str) -> Dict[str, Any] | None:
        """Find user by username, or nasabah's customer_id, account_no, or NIK."""
        clean_id = identifier.strip()
        
        # 1. Search directly by users.username
        user = db.fetch_one("SELECT * FROM users WHERE username = ?", (clean_id,))
        if user:
            return user
        
        # 2. Search by nasabah customer_id, account_no, or NIK
        user_by_nasabah = db.fetch_one(
            """
            SELECT u.* FROM users u
            JOIN nasabah n ON u.nasabah_id = n.id
            WHERE n.customer_id = ? OR n.account_no = ? OR n.nik = ?
            """,
            (clean_id, clean_id, clean_id)
        )
        return user_by_nasabah

    @classmethod
    def login(cls, data: LoginRequest) -> Dict[str, Any]:
        """Authenticate user with identifier and password."""
        user = cls.find_user_by_identifier(data.identifier)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="ID/Nomor Rekening/NIK/Username atau password salah.",
            )
        
        if not verify_password(data.password, user["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="ID/Nomor Rekening/NIK/Username atau password salah.",
            )
        
        if not user.get("is_active", 1):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Akun Anda telah dinonaktifkan. Silakan hubungi petugas.",
            )

        nasabah_data = None
        if user.get("role") == "NASABAH" and user.get("nasabah_id"):
            nasabah_data = db.fetch_one("SELECT * FROM nasabah WHERE id = ?", (user["nasabah_id"],))
            if not nasabah_data:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Data nasabah tidak ditemukan.",
                )
            if nasabah_data.get("status") != "ACTIVE":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Status nasabah nonaktif. Silakan hubungi admin.",
                )

        # Update last_login_at
        db.execute(
            "UPDATE users SET last_login_at = datetime('now') WHERE id = ?",
            (user["id"],)
        )

        token_payload = {
            "sub": user["id"],
            "role": user["role"],
            "username": user["username"],
        }
        if nasabah_data:
            token_payload["nasabah_id"] = nasabah_data["id"]

        access_token = create_access_token(token_payload)
        refresh_token = create_refresh_token(token_payload)

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "Bearer",
            "user": {
                "id": user["id"],
                "username": user["username"],
                "role": user["role"],
                "is_active": bool(user["is_active"]),
                "nasabah": nasabah_data,
            }
        }

    @classmethod
    def refresh_token(cls, refresh_token_str: str) -> Dict[str, Any]:
        """Exchange refresh token for a new access & refresh token pair."""
        payload = decode_token(refresh_token_str)
        if not payload or payload.get("type") != "refresh" or "sub" not in payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token tidak valid atau telah kedaluwarsa.",
            )
        
        user = db.fetch_one("SELECT * FROM users WHERE id = ?", (payload["sub"],))
        if not user or not user.get("is_active", 1):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Pengguna tidak aktif atau tidak ditemukan.",
            )
        
        token_payload = {
            "sub": user["id"],
            "role": user["role"],
            "username": user["username"],
        }
        if user.get("nasabah_id"):
            token_payload["nasabah_id"] = user["nasabah_id"]

        new_access_token = create_access_token(token_payload)
        new_refresh_token = create_refresh_token(token_payload)

        return {
            "access_token": new_access_token,
            "refresh_token": new_refresh_token,
            "token_type": "Bearer",
        }

    @classmethod
    def change_password(cls, user_id: str, data: ChangePasswordRequest) -> None:
        """Update user password after validating existing password."""
        user = db.fetch_one("SELECT * FROM users WHERE id = ?", (user_id,))
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Pengguna tidak ditemukan.",
            )
        
        if not verify_password(data.old_password, user["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password saat ini salah.",
            )
        
        new_hashed = get_password_hash(data.new_password)
        db.execute(
            "UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?",
            (new_hashed, user_id)
        )


auth_service = AuthService()
