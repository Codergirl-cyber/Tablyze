"""In-memory store for the most recently uploaded dataset (single-process)."""

from __future__ import annotations

import threading
from dataclasses import dataclass

import pandas as pd


@dataclass
class StoredDataset:
    filename: str
    dataframe: pd.DataFrame


class DatasetStore:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._current: StoredDataset | None = None

    def set_dataset(self, dataframe: pd.DataFrame, filename: str) -> None:
        with self._lock:
            self._current = StoredDataset(
                filename=filename or "upload.csv",
                dataframe=dataframe.copy(),
            )

    def get_dataset(self) -> StoredDataset | None:
        with self._lock:
            if self._current is None:
                return None
            return StoredDataset(
                filename=self._current.filename,
                dataframe=self._current.dataframe.copy(),
            )

    def has_dataset(self) -> bool:
        with self._lock:
            return self._current is not None


dataset_store = DatasetStore()
