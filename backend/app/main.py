import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.auth import router as auth_router
from app.api.v1.categories import router as categories_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.me import router as me_router
from app.api.v1.nasabah import router as nasabah_router
from app.api.v1.prices import router as prices_router
from app.api.v1.reports import router as reports_router
from app.api.v1.transactions import router as transactions_router
from app.api.v1.users import router as users_router
from app.core.config import settings
from app.db.migrations import run_migrations
from app.db.seed import seed_database
from app.utils.responses import error_response, success_response

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("bsuvh-api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup & shutdown events."""
    logger.info("Initializing database migrations and seed data...")
    try:
        run_migrations()
        seed_database()
        logger.info("Database initialization completed successfully.")
    except Exception as e:
        logger.error(f"Error during database initialization: {e}", exc_info=True)
    yield
    logger.info("Application shutting down...")


app = FastAPI(
    title=settings.APP_NAME,
    description="REST API Backend untuk Sistem Tabungan Bank Sampah BSU Villa Harmonis.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware
origins = settings.CORS_ORIGINS
if isinstance(origins, str):
    origins = [origins]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins != ["*"] else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global Exception Handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle standard HTTPExceptions with uniform JSON format."""
    return error_response(
        message=exc.detail if isinstance(exc.detail, str) else "Terjadi kesalahan pada permintaan.",
        error_code=f"HTTP_{exc.status_code}",
        status_code=exc.status_code,
        details=exc.detail if not isinstance(exc.detail, str) else None
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle Pydantic validation errors with human-friendly message."""
    from fastapi.encoders import jsonable_encoder
    errors = jsonable_encoder(exc.errors())
    first_error_msg = "Data yang dikirim tidak valid."
    if errors:
        loc = " -> ".join([str(l) for l in errors[0].get("loc", []) if l != "body"])
        msg = errors[0].get("msg", "")
        if loc:
            first_error_msg = f"{loc}: {msg}"
        else:
            first_error_msg = msg

    return error_response(
        message=first_error_msg,
        error_code="VALIDATION_ERROR",
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        details=errors
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    """Catch-all unhandled exceptions."""
    logger.error(f"Unhandled Exception: {exc}", exc_info=True)
    return error_response(
        message="Terjadi kesalahan internal pada server.",
        error_code="INTERNAL_SERVER_ERROR",
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
    )


# Include Routers under /api/v1
api_v1_prefix = "/api/v1"
app.include_router(auth_router, prefix=api_v1_prefix)
app.include_router(nasabah_router, prefix=api_v1_prefix)
app.include_router(me_router, prefix=api_v1_prefix)
app.include_router(categories_router, prefix=api_v1_prefix)
app.include_router(prices_router, prefix=api_v1_prefix)
app.include_router(transactions_router, prefix=api_v1_prefix)
app.include_router(reports_router, prefix=api_v1_prefix)
app.include_router(dashboard_router, prefix=api_v1_prefix)
app.include_router(users_router, prefix=api_v1_prefix)


@app.get("/", tags=["System"])
def root():
    """Root status endpoint."""
    return success_response(
        data={
            "app_name": settings.APP_NAME,
            "version": "1.0.0",
            "status": "online",
            "docs": "/docs",
        },
        message=f"Selamat datang di {settings.APP_NAME} API"
    )


@app.get("/health", tags=["System"])
def health():
    """Health check endpoint."""
    return {"status": "healthy"}
