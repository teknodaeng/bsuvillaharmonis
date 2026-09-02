from typing import Generator, List, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from app.core.database import db
from app.core.security import decode_token

security = HTTPBearer(auto_error=False)


def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> dict:
    """Validate Bearer token and retrieve the current authenticated user with nasabah details if applicable."""
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token autentikasi tidak ditemukan.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    payload = decode_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token tidak valid atau telah kedaluwarsa.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("sub")
    # Query user from database
    user = db.fetch_one("SELECT * FROM users WHERE id = ?", (user_id,))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Pengguna tidak ditemukan.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.get("is_active", 1):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akun Anda telah dinonaktifkan. Silakan hubungi petugas.",
        )
    
    # If role is NASABAH, attach nasabah data and verify nasabah status
    if user.get("role") == "NASABAH" and user.get("nasabah_id"):
        nasabah = db.fetch_one("SELECT * FROM nasabah WHERE id = ?", (user["nasabah_id"],))
        if not nasabah:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Data nasabah tidak ditemukan.",
            )
        if nasabah.get("status") != "ACTIVE":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Status nasabah nonaktif. Silakan hubungi admin.",
            )
        user["nasabah"] = nasabah
    else:
        user["nasabah"] = None
        
    return user


def require_role(allowed_roles: List[str]):
    """Role-based access control dependency factory."""
    def role_checker(current_user: dict = Depends(get_current_user)) -> dict:
        if current_user.get("role") not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Anda tidak memiliki izin untuk mengakses resource ini.",
            )
        return current_user
    return role_checker


# Convenient role shortcuts
require_admin = require_role(["ADMIN"])
require_nasabah = require_role(["NASABAH"])
require_any_authenticated = require_role(["ADMIN", "NASABAH"])
