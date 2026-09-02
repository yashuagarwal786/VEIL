from abc import ABC, abstractmethod
from pathlib import Path


class StoredFile:
    def __init__(self, path: Path, reference: str) -> None:
        self.path = path
        self.reference = reference


class StorageBackend(ABC):
    @abstractmethod
    def save(self, filename: str, content: bytes) -> StoredFile:
        raise NotImplementedError

    @abstractmethod
    def read(self, reference: str) -> bytes:
        raise NotImplementedError
