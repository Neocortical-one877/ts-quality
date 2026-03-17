from __future__ import annotations

from dataclasses import dataclass


@dataclass
class RocsCliError(Exception):
    """
    Normalized, user-facing error for CLI operations.

    `kind` is intended for machine consumers (JSON error envelope).
    """

    kind: str
    message: str
    exit_code: int = 1
    details: dict | None = None

    def __str__(self) -> str:  # pragma: no cover
        return self.message
