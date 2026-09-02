import os
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import pytest
from fastapi.testclient import TestClient

# Configure test environment before importing app
os.environ["APP_ENV"] = "testing"
os.environ["LOCAL_DB_PATH"] = "test_bsuvh.db"
os.environ["DATABASE_URL"] = ""
os.environ["TURSO_AUTH_TOKEN"] = ""

from app.core.config import settings
settings.LOCAL_DB_PATH = "test_bsuvh.db"
settings.DATABASE_URL = ""

from app.core.database import db
from app.db.migrations import run_migrations
from app.db.seed import seed_database
from app.main import app


@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """Setup clean test database before tests and clean up after."""
    if os.path.exists("test_bsuvh.db"):
        os.remove("test_bsuvh.db")
    
    run_migrations()
    seed_database()
    
    yield
    
    if os.path.exists("test_bsuvh.db"):
        try:
            os.remove("test_bsuvh.db")
        except Exception:
            pass


@pytest.fixture
def client():
    """FastAPI Test Client."""
    with TestClient(app) as c:
        yield c


@pytest.fixture
def admin_auth_headers(client):
    """Obtain auth bearer token headers for default admin."""
    res = client.post(
        "/api/v1/auth/login",
        json={"identifier": "admin", "password": "AdminPassword123!"}
    )
    assert res.status_code == 200
    token = res.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}
