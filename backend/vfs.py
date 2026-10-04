"""In-request virtual filesystem over R2 (`papers/...` keys)."""

from __future__ import annotations

import fnmatch
from dataclasses import dataclass, field
from typing import Any, Iterator


def _norm(key: str) -> str:
    return str(key or "").replace("\\", "/").lstrip("/")


@dataclass
class Vfs:
    env: Any
    cache: dict[str, bytes | None] = field(default_factory=dict)
    puts: dict[str, bytes] = field(default_factory=dict)
    deletes: set[str] = field(default_factory=set)

    def exists(self, key: str) -> bool:
        key = _norm(key)
        if key in self.deletes and key not in self.puts:
            return False
        if key in self.puts:
            return True
        if key in self.cache:
            return self.cache[key] is not None
        return False

    def read_bytes(self, key: str) -> bytes:
        key = _norm(key)
        if key in self.deletes and key not in self.puts:
            raise FileNotFoundError(key)
        if key in self.puts:
            return self.puts[key]
        data = self.cache.get(key)
        if data is None:
            raise FileNotFoundError(key)
        return data

    def write_bytes(self, key: str, data: bytes) -> None:
        key = _norm(key)
        self.deletes.discard(key)
        self.puts[key] = data
        self.cache[key] = data

    def delete(self, key: str) -> None:
        key = _norm(key)
        self.puts.pop(key, None)
        self.cache[key] = None
        self.deletes.add(key)

    def glob(self, prefix: str, pattern: str) -> list[str]:
        prefix = _norm(prefix).rstrip("/") + "/"
        keys = set(self.cache) | set(self.puts)
        out = []
        for key in keys:
            if key in self.deletes and key not in self.puts:
                continue
            if not key.startswith(prefix):
                continue
            name = key[len(prefix):]
            if "/" in name:
                continue
            if fnmatch.fnmatch(name, pattern):
                out.append(key)
        return sorted(out)

    async def fetch(self, key: str) -> bytes | None:
        key = _norm(key)
        if key in self.puts:
            return self.puts[key]
        if key in self.deletes:
            return None
        if key in self.cache:
            return self.cache[key]
        obj = await self.env.BUCKET.get(key)
        if obj is None:
            self.cache[key] = None
            return None
        data = await _r2_bytes(obj)
        self.cache[key] = data
        return data

    async def flush(self) -> None:
        bucket = self.env.BUCKET
        for key in sorted(self.deletes):
            if key not in self.puts:
                await bucket.delete(key)
        for key, data in self.puts.items():
            await bucket.put(key, data)


async def _r2_bytes(obj) -> bytes:
    if hasattr(obj, "arrayBuffer"):
        return bytes(await obj.arrayBuffer())
    body = getattr(obj, "body", None)
    if body is not None and hasattr(body, "bytes"):
        return bytes(await body.bytes())
    raise RuntimeError("Unable to read R2 object body")


class VPath:
    """Path-like object whose strings are R2 keys."""

    def __init__(self, key: str = ""):
        self.key = _norm(key)

    def __str__(self) -> str:
        return self.key

    def __fspath__(self) -> str:
        return self.key

    def __truediv__(self, other: object) -> "VPath":
        name = str(other).replace("\\", "/").lstrip("/")
        if not self.key:
            return VPath(name)
        return VPath(f"{self.key.rstrip('/')}/{name}")

    @property
    def name(self) -> str:
        return self.key.rsplit("/", 1)[-1]

    @property
    def parent(self) -> "VPath":
        if "/" not in self.key:
            return VPath("")
        return VPath(self.key.rsplit("/", 1)[0])

    def mkdir(self, parents: bool = False, exist_ok: bool = False) -> None:
        return None

    def is_file(self) -> bool:
        from runtime import current

        return current().vfs.exists(self.key)

    def is_dir(self) -> bool:
        return False

    def read_text(self, encoding: str = "utf-8") -> str:
        from runtime import current

        return current().vfs.read_bytes(self.key).decode(encoding)

    def read_bytes(self) -> bytes:
        from runtime import current

        return current().vfs.read_bytes(self.key)

    def write_text(self, text: str, encoding: str = "utf-8") -> None:
        from runtime import current

        current().vfs.write_bytes(self.key, text.encode(encoding))

    def write_bytes(self, data: bytes) -> None:
        from runtime import current

        current().vfs.write_bytes(self.key, data)

    def unlink(self) -> None:
        from runtime import current

        current().vfs.delete(self.key)

    def glob(self, pattern: str) -> Iterator["VPath"]:
        from runtime import current

        for key in current().vfs.glob(self.key, pattern):
            yield VPath(key)

    def relative_to(self, _root: object) -> "VPath":
        return self

    def resolve(self) -> "VPath":
        return self
