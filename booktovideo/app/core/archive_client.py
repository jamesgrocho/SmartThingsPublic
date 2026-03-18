"""
Internet Archive client.
- Search books by title/author
- Fetch metadata (page count, title, creator)
- Download page images (JPEG)
- Download OCR text (_djvu.txt) and parse into per-page blocks
"""
import re
import zipfile
from io import BytesIO
from pathlib import Path
from typing import Callable, Optional

import requests

SEARCH_URL = "https://archive.org/advancedsearch.php"
METADATA_URL = "https://archive.org/metadata/{identifier}"
DOWNLOAD_URL = "https://archive.org/download/{identifier}/{filename}"


def search(query: str, rows: int = 20) -> list[dict]:
    """Return list of {identifier, title, creator} dicts."""
    params = {
        "q": f"({query}) AND mediatype:texts AND language:English",
        "fl[]": ["identifier", "title", "creator", "description"],
        "rows": rows,
        "page": 1,
        "output": "json",
    }
    resp = requests.get(SEARCH_URL, params=params, timeout=15)
    resp.raise_for_status()
    docs = resp.json().get("response", {}).get("docs", [])
    results = []
    for doc in docs:
        results.append(
            {
                "identifier": doc.get("identifier", ""),
                "title": doc.get("title", "Unknown Title"),
                "creator": doc.get("creator", "Unknown Author"),
                "description": doc.get("description", ""),
            }
        )
    return results


def get_metadata(identifier: str) -> dict:
    """Return full metadata dict for an IA item."""
    resp = requests.get(METADATA_URL.format(identifier=identifier), timeout=15)
    resp.raise_for_status()
    return resp.json()


def get_files(identifier: str) -> list[dict]:
    """Return list of file dicts from IA metadata."""
    meta = get_metadata(identifier)
    return meta.get("files", [])


def _find_ocr_file(files: list[dict]) -> Optional[str]:
    """Find the _djvu.txt OCR file name."""
    for f in files:
        name = f.get("name", "")
        if name.endswith("_djvu.txt"):
            return name
    return None


def _find_page_image_zip(files: list[dict]) -> Optional[str]:
    """Find the Single Page Processed JP2 ZIP or JPEG ZIP."""
    for f in files:
        name = f.get("name", "")
        if "Single_Page_Processed_JP2" in name and name.endswith(".zip"):
            return name
    # Fallback: any JP2 zip
    for f in files:
        name = f.get("name", "")
        if "jp2.zip" in name.lower() or "jp2_zip" in name.lower():
            return name
    return None


def _find_jpeg_files(files: list[dict]) -> list[str]:
    """Find individually listed JPEG page files."""
    jpegs = [
        f["name"]
        for f in files
        if f.get("name", "").lower().endswith(".jpg")
        and re.search(r"_\d{4}\.jpg$", f.get("name", ""))
    ]
    return sorted(jpegs)


def parse_djvu_ocr(text: str) -> list[str]:
    """
    Parse _djvu.txt into a list of page text strings.
    Pages are separated by form feed characters (\\x0c).
    """
    pages = text.split("\x0c")
    # Strip leading/trailing whitespace; drop blank pages
    cleaned = [p.strip() for p in pages]
    return cleaned


def download_ocr(identifier: str, files: list[dict]) -> list[str]:
    """Download and parse OCR text. Returns list of page texts."""
    ocr_filename = _find_ocr_file(files)
    if not ocr_filename:
        return []
    url = DOWNLOAD_URL.format(identifier=identifier, filename=ocr_filename)
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    text = resp.text
    return parse_djvu_ocr(text)


def download_pages(
    identifier: str,
    files: list[dict],
    output_dir: Path,
    start_page: int,
    end_page: int,
    progress_cb: Optional[Callable[[int, int], None]] = None,
) -> list[Path]:
    """
    Download page images for pages [start_page, end_page] (1-indexed).
    Returns list of local file paths in order.

    Strategy:
    1. Try Single Page JP2 ZIP — extract pages from it.
    2. Fall back to individually listed JPEGs.
    """
    output_dir.mkdir(parents=True, exist_ok=True)

    zip_name = _find_page_image_zip(files)
    if zip_name:
        return _download_from_zip(
            identifier, zip_name, output_dir, start_page, end_page, progress_cb
        )
    else:
        jpeg_files = _find_jpeg_files(files)
        if jpeg_files:
            return _download_individual_jpegs(
                identifier, jpeg_files, output_dir, start_page, end_page, progress_cb
            )
    return []


def _download_from_zip(
    identifier: str,
    zip_name: str,
    output_dir: Path,
    start_page: int,
    end_page: int,
    progress_cb,
) -> list[Path]:
    url = DOWNLOAD_URL.format(identifier=identifier, filename=zip_name)
    resp = requests.get(url, timeout=120, stream=True)
    resp.raise_for_status()

    # Stream zip into memory (these zips can be large; use temp file approach)
    data = BytesIO()
    for chunk in resp.iter_content(chunk_size=8192):
        data.write(chunk)
    data.seek(0)

    saved = []
    with zipfile.ZipFile(data) as zf:
        # Sort member names — they are typically named _0001.jp2 etc.
        members = sorted(
            [m for m in zf.namelist() if re.search(r"\d{4}\.(jp2|jpg|jpeg)$", m, re.I)]
        )
        # Slice to requested page range (0-indexed slice of 1-indexed pages)
        page_members = members[start_page - 1 : end_page]
        total = len(page_members)
        for i, member in enumerate(page_members):
            page_num = start_page + i
            ext = Path(member).suffix.lstrip(".")
            out_path = output_dir / f"page_{page_num:04d}.{ext}"
            if not out_path.exists():
                with zf.open(member) as src, open(out_path, "wb") as dst:
                    dst.write(src.read())
            saved.append(out_path)
            if progress_cb:
                progress_cb(i + 1, total)

    return saved


def _download_individual_jpegs(
    identifier: str,
    jpeg_files: list[str],
    output_dir: Path,
    start_page: int,
    end_page: int,
    progress_cb,
) -> list[Path]:
    page_files = jpeg_files[start_page - 1 : end_page]
    total = len(page_files)
    saved = []
    for i, filename in enumerate(page_files):
        page_num = start_page + i
        out_path = output_dir / f"page_{page_num:04d}.jpg"
        if not out_path.exists():
            url = DOWNLOAD_URL.format(identifier=identifier, filename=filename)
            resp = requests.get(url, timeout=30)
            resp.raise_for_status()
            out_path.write_bytes(resp.content)
        saved.append(out_path)
        if progress_cb:
            progress_cb(i + 1, total)
    return saved


def count_pages(identifier: str, files: list[dict]) -> int:
    """Estimate page count from IA files."""
    zip_name = _find_page_image_zip(files)
    if zip_name:
        # IA metadata has a 'size' field but not a direct page count.
        # Try to get it from metadata instead.
        meta = get_metadata(identifier)
        page_count = meta.get("metadata", {}).get("imagecount")
        if page_count:
            try:
                return int(page_count)
            except (ValueError, TypeError):
                pass

    # Count individual JPEGs
    jpegs = _find_jpeg_files(files)
    if jpegs:
        return len(jpegs)

    return 0
