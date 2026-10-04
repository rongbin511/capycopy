"""Per-request Worker env: D1 catalog snapshot + R2 VFS."""

from __future__ import annotations

import json
from contextvars import ContextVar
from dataclasses import dataclass, field
from typing import Any

from database import PaperEntry, SchoolEntry, SectionEntry, SubjectEntry, UserEntry
from local_env import LocalEnv
from vfs import Vfs

_CURRENT: ContextVar["Runtime | None"] = ContextVar("tpb_runtime", default=None)


def current() -> "Runtime":
    rt = _CURRENT.get()
    if rt is None:
        raise RuntimeError("Worker runtime is not bound")
    return rt


def _row(row: Any) -> dict[str, Any]:
    if row is None:
        return {}
    if hasattr(row, "to_py"):
        row = row.to_py()
    if isinstance(row, dict):
        return row
    try:
        return dict(row)
    except Exception:
        data = {}
        for name in ("school_id", "slug", "official_name", "zh", "short_name",
                     "subject_id", "label", "sectionids", "section_id", "stem",
                     "title", "interaction", "marks", "instruction", "template",
                     "paper_id", "level", "subject", "year", "term", "school",
                     "user_id", "gender", "preference", "last_viewed", "role"):
            if hasattr(row, name):
                data[name] = getattr(row, name)
        return data


def _loads(raw: Any, fallback):
    if isinstance(raw, (dict, list)):
        return raw
    text = str(raw or "").strip()
    if not text:
        return fallback
    return json.loads(text)


async def _all(db, sql: str, *params) -> list[dict[str, Any]]:
    stmt = db.prepare(sql)
    if params:
        stmt = stmt.bind(*params)
    res = await stmt.all()
    rows = getattr(res, "results", None)
    if rows is None and isinstance(res, dict):
        rows = res.get("results")
    return [_row(r) for r in (rows or [])]


@dataclass
class Runtime:
    env: Any
    vfs: Vfs
    schools: dict[str, SchoolEntry] = field(default_factory=dict)
    subjects: dict[str, SubjectEntry] = field(default_factory=dict)
    sections: dict[str, SectionEntry] = field(default_factory=dict)
    papers: dict[str, PaperEntry] = field(default_factory=dict)
    users: dict[str, UserEntry] = field(default_factory=dict)
    sql: list[tuple[str, tuple]] = field(default_factory=list)

    def queue(self, sql: str, *params: Any) -> None:
        self.sql.append((sql, params))

    async def flush(self) -> None:
        db = self.env.DB
        for sql, params in self.sql:
            stmt = db.prepare(sql)
            if params:
                stmt = stmt.bind(*params)
            await stmt.run()
        self.sql.clear()
        await self.vfs.flush()

    async def hydrate(self, key: str) -> bytes | None:
        return await self.vfs.fetch(key)


async def bind(env: Any = None) -> Runtime:
    if env is None:
        env = LocalEnv()
    vfs = Vfs(env=env)
    rt = Runtime(env=env, vfs=vfs)
    db = env.DB
    for row in await _all(db, "SELECT * FROM schools ORDER BY school_id"):
        entry = SchoolEntry.model_validate(row)
        rt.schools[entry.school_id] = entry
    for row in await _all(db, "SELECT * FROM subjects ORDER BY subject_id"):
        row = dict(row)
        row["sectionids"] = _loads(row.get("sectionids"), [])
        entry = SubjectEntry.model_validate(row)
        rt.subjects[entry.subject_id] = entry
    for row in await _all(db, "SELECT * FROM sections ORDER BY section_id"):
        row = dict(row)
        row["template"] = _loads(row.get("template"), {})
        entry = SectionEntry.model_validate(row)
        rt.sections[str(entry.section_id)] = entry
    for row in await _all(db, "SELECT * FROM papers ORDER BY paper_id"):
        entry = PaperEntry.model_validate(row)
        rt.papers[entry.paper_id] = entry
    for row in await _all(db, "SELECT * FROM users ORDER BY user_id"):
        row = dict(row)
        row["preference"] = _loads(row.get("preference"), {})
        entry = UserEntry.model_validate(row)
        rt.users[entry.user_id] = entry
    _CURRENT.set(rt)
    return rt


def reset() -> None:
    _CURRENT.set(None)
