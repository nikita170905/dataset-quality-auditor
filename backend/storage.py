from __future__ import annotations

from typing import Optional
from uuid import uuid4

_store: dict[str, bytes] = {}


def store_file_bytes(file_bytes: bytes) -> str:
    """Store raw file bytes in memory and return a generated UUID."""
    file_id = str(uuid4())
    _store[file_id] = file_bytes
    return file_id


def get_file_bytes(file_id: str) -> Optional[bytes]:
    """Return stored file bytes for the given file_id, or None if not found."""
    return _store.get(file_id)
