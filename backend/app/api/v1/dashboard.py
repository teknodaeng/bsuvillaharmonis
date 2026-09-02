from fastapi import APIRouter, Depends
from app.core.deps import require_admin, require_nasabah
from app.services.dashboard_service import dashboard_service
from app.utils.responses import success_response

router = APIRouter(tags=["Dashboard"])


@router.get("/admin/dashboard")
def get_admin_dashboard(admin_user: dict = Depends(require_admin)):
    """Ringkasan statistik operasional untuk dashboard admin."""
    data = dashboard_service.get_admin_dashboard()
    return success_response(data=data)
