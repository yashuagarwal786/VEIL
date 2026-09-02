import re
from pathlib import Path
from uuid import uuid4

from app.storage.base import StorageBackend, StoredFile


class LocalStorage(StorageBackend):
    def __init__(self, root: Path | None = None) -> None:
        self.root = root or Path("storage") / "documents"
        self.root.mkdir(parents=True, exist_ok=True)

    def save(self, filename: str, content: bytes) -> StoredFile:
        safe_name = re.sub(r"[^A-Za-z0-9._-]", "_", Path(filename).name)
        path = self.root / f"{uuid4().hex}_{safe_name}"
        path.write_bytes(content)
        return StoredFile(path=path, reference=str(path))

    def read(self, reference: str) -> bytes:
        path = Path(reference)
        resolved = path.resolve()
        root = self.root.resolve()
        if root not in resolved.parents and resolved != root:
            raise ValueError("Storage reference is outside the configured storage root.")
        return path.read_bytes()
