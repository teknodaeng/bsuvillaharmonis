from typing import Any, Dict, Optional
from fastapi.responses import JSONResponse


def success_response(data: Any = None, message: str = "OK", status_code: int = 200) -> Dict[str, Any]:
    """Standard success API response dictionary."""
    response = {
        "success": True,
        "message": message,
    }
    if data is not None:
        response["data"] = data
    return response


def error_response(
    message: str = "Terjadi kesalahan",
    error_code: Optional[str] = None,
    status_code: int = 400,
    details: Any = None
) -> JSONResponse:
    """Standard error API JSONResponse."""
    content: Dict[str, Any] = {
        "success": False,
        "message": message,
    }
    if error_code:
        content["error_code"] = error_code
    if details:
        content["details"] = details
    return JSONResponse(status_code=status_code, content=content)
