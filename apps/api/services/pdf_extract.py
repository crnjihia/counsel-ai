import hashlib
import io
import pdfplumber
from typing import Tuple

async def extract_text(file_bytes: bytes) -> Tuple[str, int]:
    """Extract text from a PDF, preserving per-page markers: \n---PAGE N---\n.
    Returns (combined_text, page_count).
    """
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        pages_text = []
        page_count = len(pdf.pages)
        for i, page in enumerate(pdf.pages, start=1):
            text = page.extract_text() or ""
            pages_text.append(f"\n---PAGE {i}---\n{text.strip()}")
        combined = "".join(pages_text).strip()
        return combined, page_count

def sha256_hash(data: bytes) -> str:
    """Compute sha256 checksum of raw binary data."""
    return hashlib.sha256(data).hexdigest()
