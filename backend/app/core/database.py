import os
import sqlite3
from contextlib import contextmanager
from typing import Any, Dict, List, Optional, Tuple, Union
from app.core.config import settings

# Check if libsql is available for Turso remote connection
try:
    import libsql_experimental as libsql  # type: ignore
    HAS_LIBSQL = True
except ImportError:
    try:
        import libsql  # type: ignore
        HAS_LIBSQL = True
    except ImportError:
        HAS_LIBSQL = False


class Database:
    def __init__(self):
        self._connection = None

    def get_connection(self):
        """Create or return a connection to Turso / SQLite."""
        # If Turso URL is provided, use libsql client
        if settings.DATABASE_URL:
            if HAS_LIBSQL:
                auth_token = settings.TURSO_AUTH_TOKEN or None
                conn = libsql.connect(settings.DATABASE_URL, auth_token=auth_token)
                return conn
            else:
                # If DATABASE_URL is a file URI or libsql wasn't installed, fallback to sqlite3 if local
                if settings.DATABASE_URL.startswith("file:") or not settings.DATABASE_URL.startswith("libsql:"):
                    db_path = settings.DATABASE_URL.replace("sqlite:///", "").replace("file:", "")
                    conn = sqlite3.connect(db_path, check_same_thread=False)
                    conn.row_factory = sqlite3.Row
                    return conn
                else:
                    raise RuntimeError(
                        "libsql library is not installed, but a remote Turso DATABASE_URL was specified. "
                        "Please install libsql-experimental."
                    )
        else:
            # Local SQLite database
            db_path = settings.LOCAL_DB_PATH
            conn = sqlite3.connect(db_path, check_same_thread=False)
            conn.row_factory = sqlite3.Row
            # Enable Foreign Keys & WAL mode in SQLite
            conn.execute("PRAGMA foreign_keys = ON;")
            conn.execute("PRAGMA journal_mode = WAL;")
            return conn

    @contextmanager
    def connection(self):
        """Context manager for acquiring a database connection."""
        conn = self.get_connection()
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def execute(self, query: str, params: Union[Tuple, List, Dict] = ()) -> Any:
        """Execute a single query with commit."""
        with self.connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            return cursor

    def execute_script(self, script: str) -> None:
        """Execute multiple SQL statements."""
        with self.connection() as conn:
            conn.executescript(script)

    def fetch_one(self, query: str, params: Union[Tuple, List, Dict] = ()) -> Optional[Dict[str, Any]]:
        """Fetch a single row as a dictionary."""
        with self.connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            row = cursor.fetchone()
            if row is None:
                return None
            if hasattr(row, "keys"):
                return {k: row[k] for k in row.keys()}
            elif isinstance(row, dict):
                return row
            elif hasattr(cursor, "description") and cursor.description:
                cols = [col[0] for col in cursor.description]
                return dict(zip(cols, row))
            return dict(row)

    def fetch_all(self, query: str, params: Union[Tuple, List, Dict] = ()) -> List[Dict[str, Any]]:
        """Fetch all matching rows as a list of dictionaries."""
        with self.connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            rows = cursor.fetchall()
            if not rows:
                return []
            results = []
            cols = [col[0] for col in cursor.description] if cursor.description else []
            for row in rows:
                if hasattr(row, "keys"):
                    results.append({k: row[k] for k in row.keys()})
                elif isinstance(row, dict):
                    results.append(row)
                elif cols:
                    results.append(dict(zip(cols, row)))
                else:
                    results.append(dict(row))
            return results


db = Database()
