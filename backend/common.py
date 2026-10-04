from vfs import VPath

REPO_ROOT = VPath("")
PAPERS_DIR = VPath("papers")
MANIFEST_JSON = PAPERS_DIR / "manifest.json"

LEVELS: tuple[str, ...] = ("P4", "P5", "P6")
TERMS: tuple[str, ...] = ("wa1", "wa2", "wa3", "sa1", "sa2")
