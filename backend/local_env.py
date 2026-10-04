"""Local stand-in for Cloudflare D1 + R2 using files under this repo.

Used by ``npm run dev`` (uvicorn) so Wrangler/workerd is not required.
Keys match R2: ``papers/<subject>/<paper_id>/...``.
"""

from __future__ import annotations

import os
import sqlite3
from pathlib import Path
from typing import Any


def repo_root() -> Path:
    raw = os.environ.get("CAPYCOPY_ROOT")
    if raw:
        return Path(raw).expanduser().resolve()
    return Path(__file__).resolve().parents[1]


class _QueryResult:
    def __init__(self, results: list[dict[str, Any]] | None = None, row: dict[str, Any] | None = None):
        self.results = results or []
        self._row = row

    def to_py(self) -> dict[str, Any]:
        return {"results": self.results}


class _Stmt:
    def __init__(self, conn: sqlite3.Connection, sql: str, params: tuple = ()):
        self._conn = conn
        self._sql = sql
        self._params = params

    def bind(self, *params: Any) -> "_Stmt":
        return _Stmt(self._conn, self._sql, params)

    def _execute(self) -> sqlite3.Cursor:
        cur = self._conn.execute(self._sql, self._params)
        self._conn.commit()
        return cur

    def _rows(self, cur: sqlite3.Cursor) -> list[dict[str, Any]]:
        if cur.description is None:
            return []
        cols = [d[0] for d in cur.description]
        return [dict(zip(cols, row)) for row in cur.fetchall()]

    async def all(self) -> _QueryResult:
        return _QueryResult(results=self._rows(self._execute()))

    async def first(self) -> dict[str, Any] | None:
        rows = self._rows(self._execute())
        return rows[0] if rows else None

    async def run(self) -> _QueryResult:
        self._execute()
        return _QueryResult()


class SqliteD1:
    def __init__(self, db_path: Path):
        db_path.parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(str(db_path), check_same_thread=False)

    def prepare(self, sql: str) -> _Stmt:
        return _Stmt(self._conn, sql)


class _R2Body:
    def __init__(self, data: bytes):
        self._data = data

    async def arrayBuffer(self) -> bytes:
        return self._data


class LocalBucket:
    def __init__(self, repo_root: Path):
        self._root = repo_root

    def _path(self, key: str) -> Path:
        rel = str(key or "").replace("\\", "/").lstrip("/")
        return self._root.joinpath(*rel.split("/"))

    async def get(self, key: str) -> _R2Body | None:
        path = self._path(key)
        if not path.is_file():
            return None
        return _R2Body(path.read_bytes())

    async def put(self, key: str, data: bytes, **_kwargs: Any) -> None:
        path = self._path(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        if isinstance(data, str):
            data = data.encode("utf-8")
        path.write_bytes(data)

    async def delete(self, key: str) -> None:
        path = self._path(key)
        if path.is_file():
            path.unlink()


class LocalEnv:
    is_local = True

    def __init__(self) -> None:
        root = repo_root()
        db_path = root / "papers" / "manifest.db"
        if not db_path.is_file():
            raise FileNotFoundError(
                f"Local catalog not found at {db_path}. "
                "Copy papers/ (including manifest.db) into the capycopy repo."
            )
        self.DB = SqliteD1(db_path)
        self.BUCKET = LocalBucket(root)
        self.ASSETS = None
