from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from app.core.deps import require_admin
from app.schemas.user import (
    UserCreateRequest,
    UserResetPasswordRequest,
    UserStatusUpdateRequest,
    UserUpdateRequest,
)
from app.services.user_service import user_service
from app.utils.responses import success_response

router = APIRouter(prefix="/admin/users", tags=["Manajemen Users & Nasabah (Admin)"])


@router.get("")
def list_users(
    search: Optional[str] = Query(None, description="Pencarian nama, username, email, phone, NIK"),
    role: Optional[str] = Query(None, description="Filter role: ALL, ADMIN, NASABAH"),
    status: Optional[str] = Query(None, description="Filter status: ACTIVE/INACTIVE"),
    page: int = Query(1, ge=1, description="Nomor halaman"),
    page_size: int = Query(20, ge=1, le=1000, description="Jumlah item per halaman"),
    admin_user: dict = Depends(require_admin),
):
    """Daftar akun pengguna/nasabah dengan filter role, status, pencarian, dan pagination."""
    role_filter = None if not role or role.upper() == "ALL" else role.upper()
    items, total_items = user_service.list_users(
        search=search,
        role_filter=role_filter,
        status_filter=status,
        page=page,
        page_size=page_size,
    )
    total_pages = (total_items + page_size - 1) // page_size if total_items > 0 else 0
    return success_response(
        data={
            "items": items,
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total_items": total_items,
                "total_pages": total_pages,
            },
        }
    )


@router.post("", status_code=status.HTTP_201_CREATED)
def create_user(data: UserCreateRequest, admin_user: dict = Depends(require_admin)):
    """Tambah akun Petugas Admin atau Pengguna baru."""
    user = user_service.create_user(data, creator_id=admin_user["id"])
    return success_response(
        data=user,
        message=f"Akun pengguna {data.username} berhasil dibuat.",
        status_code=status.HTTP_201_CREATED,
    )


@router.get("/{user_id}")
def get_user_detail(user_id: str, admin_user: dict = Depends(require_admin)):
    """Detail data akun pengguna dan profil nasabah terkait jika ada."""
    user = user_service.get_user_by_id(user_id)
    return success_response(data=user)


@router.put("/{user_id}")
def update_user(
    user_id: str,
    data: UserUpdateRequest,
    admin_user: dict = Depends(require_admin),
):
    """Perbarui informasi akun pengguna (dan sinkronisasi profil nasabah jika role=NASABAH)."""
    user = user_service.update_user(user_id, data, updater_id=admin_user["id"])
    return success_response(
        data=user,
        message="Data pengguna berhasil diperbarui.",
    )


@router.patch("/{user_id}/status")
def toggle_user_status(
    user_id: str,
    data: UserStatusUpdateRequest,
    admin_user: dict = Depends(require_admin),
):
    """Aktifkan atau nonaktifkan akun pengguna."""
    user = user_service.toggle_user_status(user_id, data.status, updater_id=admin_user["id"])
    action_text = "diaktifkan" if data.status == "ACTIVE" else "dinonaktifkan"
    return success_response(
        data=user,
        message=f"Akun pengguna berhasil {action_text}.",
    )


@router.post("/{user_id}/reset-password")
def reset_user_password(
    user_id: str,
    data: UserResetPasswordRequest,
    admin_user: dict = Depends(require_admin),
):
    """Reset kata sandi pengguna oleh Admin."""
    result = user_service.reset_user_password(
        user_id, data.new_password, updater_id=admin_user["id"]
    )
    return success_response(
        data=result,
        message="Kata sandi pengguna berhasil direset.",
    )
