from __future__ import annotations

from pathlib import Path

RISKY_PNG_CHUNKS = {"eXIf", "tEXt", "zTXt", "iTXt", "caBX"}
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"


def risky_png_chunks(path: Path) -> list[str]:
    data = path.read_bytes()
    if not data.startswith(PNG_SIGNATURE):
        return []

    chunks = []
    offset = len(PNG_SIGNATURE)
    while offset + 8 <= len(data):
        length = int.from_bytes(data[offset : offset + 4], "big")
        kind = data[offset + 4 : offset + 8].decode("ascii", errors="replace")
        if kind in RISKY_PNG_CHUNKS:
            chunks.append(kind)
        offset += 12 + length
        if kind == "IEND":
            break

    return chunks
