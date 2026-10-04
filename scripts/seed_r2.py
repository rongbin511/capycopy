#!/usr/bin/env python3
"""Upload local papers JSON/images to Wrangler R2 (no PDFs required)."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAPERS = ROOT / "papers"
BUCKET = "capycopy-papers"
SKIP_SUFFIX = {".db", ".pdf"}


def main() -> int:
    if not PAPERS.is_dir():
        print(f"Missing {PAPERS}", file=sys.stderr)
        return 1
    files = [
        p
        for p in PAPERS.rglob("*")
        if p.is_file() and p.suffix.lower() not in SKIP_SUFFIX and p.name != ".DS_Store"
    ]
    print(f"Uploading {len(files)} objects from {PAPERS} to r2://{BUCKET} (local)")
    for i, path in enumerate(files, 1):
        key = path.relative_to(PAPERS.parent).as_posix()  # papers/...
        cmd = [
            "npx",
            "wrangler",
            "r2",
            "object",
            "put",
            f"{BUCKET}/{key}",
            "--file",
            str(path),
            "--local",
        ]
        subprocess.run(cmd, check=True, cwd=str(Path(__file__).resolve().parents[1]))
        if i % 50 == 0 or i == len(files):
            print(f"  {i}/{len(files)} {key}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
