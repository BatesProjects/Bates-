#!/usr/bin/env python3
"""
Bunnings Price Updater
Reads Price Book.xlsx, scrapes live prices from Bunnings, and updates the spreadsheet.

Usage:
  python3 update_prices.py "Price Book.xlsx"        # Run on all rows
  python3 update_prices.py --test "Price Book.xlsx" # Test on first 5 URLs only
"""

import argparse
import json
import logging
import re
import shutil
import sys
import time
from datetime import date, datetime
from pathlib import Path
from typing import Any, Optional
from urllib.parse import urlparse, urlunparse, parse_qs, urlencode

from bs4 import BeautifulSoup
import openpyxl
from openpyxl.styles import PatternFill

# ─── Optional scraping engines ─────────────────────────────────────────────────
# curl_cffi: best Cloudflare bypass (mimics Chrome TLS fingerprint exactly)
try:
    from curl_cffi import requests as cffi_requests
    CURL_CFFI_AVAILABLE = True
except ImportError:
    CURL_CFFI_AVAILABLE = False

# undetected_chromedriver: specifically engineered to bypass Cloudflare
try:
    import undetected_chromedriver as uc
    UC_AVAILABLE = True
except ImportError:
    UC_AVAILABLE = False

# Plain requests: last resort (often blocked by Cloudflare)
import requests as std_requests

# ─── Configuration ─────────────────────────────────────────────────────────────

QUOTE_SHEET_NAME = "Quote"
LOG_SHEET_NAME   = "Price Change Log"

URL_COLUMN    = 2   # Column B — Bunnings product URLs
PRICE_COLUMN  = 5   # Column E — unit price
DATE_COLUMN   = 7   # Column G — date last checked
DATA_START_ROW = 2  # Row 1 is the header row

DELAY_SECONDS = 1   # Pause between requests
TEST_LIMIT    = 5   # URLs processed in --test mode

# ─── Fill colours ──────────────────────────────────────────────────────────────
YELLOW_FILL = PatternFill(start_color="FFFF00", end_color="FFFF00", fill_type="solid")
RED_FILL    = PatternFill(start_color="FF0000", end_color="FF0000", fill_type="solid")
NO_FILL     = PatternFill(fill_type="none")

BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-AU,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection":      "keep-alive",
}


# ─── Helpers ───────────────────────────────────────────────────────────────────

def backup_spreadsheet(path: Path) -> Path:
    timestamp  = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_dir = Path.home() / "Desktop" / "Price Book Backups"
    backup_dir.mkdir(exist_ok=True)
    backup = backup_dir / f"{path.stem}_backup_{timestamp}{path.suffix}"
    shutil.copy2(path, backup)
    logging.info("Backup saved: %s", backup)
    return backup


def save_workbook(wb: openpyxl.Workbook, spreadsheet_path: Path) -> Path:
    try:
        wb.save(spreadsheet_path)
        logging.info("Saved: %s", spreadsheet_path)
        return spreadsheet_path
    except PermissionError:
        fallback = Path.home() / "Desktop" / spreadsheet_path.name
        wb.save(fallback)
        logging.warning(
            "iCloud blocked saving to the original location.\n"
            "  Updated file saved to Desktop: %s\n"
            "  Drag it back to your Price Book folder to replace the old one.",
            fallback,
        )
        return fallback


def clean_url(url: str) -> str:
    """Keep ?store= for correct local pricing; strip all other tracking params."""
    parsed = urlparse(url)
    params = parse_qs(parsed.query, keep_blank_values=True)
    kept   = {k: v for k, v in params.items() if k == "store"}
    return urlunparse(parsed._replace(query=urlencode(kept, doseq=True), fragment=""))


def _length_from_url(url: str) -> Optional[float]:
    """Parse product length in metres from a Bunnings URL (e.g. '2-4m' → 2.4)."""
    m = re.search(r'[_-](\d+)-(\d)m(?:[_?]|$)', url, re.IGNORECASE)
    if m:
        try:
            return float(f"{m.group(1)}.{m.group(2)}")
        except ValueError:
            pass
    return None


def highlight_row(ws, row_idx: int, fill: PatternFill) -> None:
    for col in range(1, ws.max_column + 1):
        ws.cell(row=row_idx, column=col).fill = fill


def get_or_create_log_sheet(wb: openpyxl.Workbook) -> openpyxl.worksheet.worksheet.Worksheet:
    if LOG_SHEET_NAME not in wb.sheetnames:
        ws = wb.create_sheet(LOG_SHEET_NAME)
        ws.append([
            "Row", "Item Description", "URL",
            "Old Price ($)", "New Price ($)", "Change ($)",
            "Date Checked", "Status",
        ])
    return wb[LOG_SHEET_NAME]


# ─── Price extraction ──────────────────────────────────────────────────────────

def _find_price_in_json(data: Any, depth: int = 0) -> Optional[float]:
    """Recursively search any JSON structure for a price value."""
    if depth > 12:
        return None
    if isinstance(data, dict):
        # Check high-priority keys first
        for key in ("sellPrice", "currentPrice", "nowPrice", "wasPrice", "price"):
            val = data.get(key)
            if val is not None and not isinstance(val, (dict, list)):
                try:
                    candidate = float(str(val).replace(",", "").replace("$", ""))
                    if 0.50 <= candidate <= 100_000:
                        return candidate
                except (ValueError, TypeError):
                    pass
        for val in data.values():
            result = _find_price_in_json(val, depth + 1)
            if result is not None:
                return result
    elif isinstance(data, list):
        for item in data:
            result = _find_price_in_json(item, depth + 1)
            if result is not None:
                return result
    return None


def _extract_price_from_html(html: str) -> Optional[float]:
    """Try every known method to pull a price out of Bunnings page HTML."""
    soup = BeautifulSoup(html, "html.parser")

    # Method 0: Per-linear-metre price (e.g. "$6.94 per linear metre")
    # Bunnings timber products show two prices — we want the per-lm one.
    lm_match = re.search(
        r'\$\s*([\d,]+\.?\d*)\s*per\s+li(?:n(?:ear|eal)|m)',
        html,
        re.IGNORECASE,
    )
    if lm_match:
        try:
            candidate = float(lm_match.group(1).replace(",", ""))
            if 0.50 <= candidate <= 100_000:
                logging.debug("  Price found via per-linear-metre pattern")
                return candidate
        except ValueError:
            pass

    # Method 1: Next.js embedded page data (__NEXT_DATA__)
    # Bunnings is a Next.js app — all product data is embedded here on load.
    tag = soup.find("script", id="__NEXT_DATA__")
    if tag and tag.string:
        try:
            next_data = json.loads(tag.string)
            price = _find_price_in_json(next_data)
            if price is not None:
                logging.debug("  Price found in __NEXT_DATA__")
                return price
        except (json.JSONDecodeError, ValueError):
            pass

    # Method 2: JSON-LD structured data
    for tag in soup.find_all("script", type="application/ld+json"):
        try:
            data  = json.loads(tag.string or "")
            items = data if isinstance(data, list) else [data]
            for item in items:
                if item.get("@type") == "Product":
                    offers = item.get("offers") or {}
                    if isinstance(offers, list):
                        offers = offers[0]
                    price_val = offers.get("price")
                    if price_val is not None:
                        return float(str(price_val).replace(",", ""))
        except (json.JSONDecodeError, ValueError, TypeError):
            continue

    # Method 3: Any other embedded JSON blocks
    for tag in soup.find_all("script"):
        text = tag.string or ""
        if not any(k in text for k in ("sellPrice", "currentPrice", "nowPrice")):
            continue
        try:
            # Find a JSON object containing a price key
            for m in re.finditer(r'\{[^{}]*"(?:sellPrice|currentPrice|nowPrice)"\s*:\s*[\d.]+[^{}]*\}', text):
                try:
                    obj = json.loads(m.group())
                    price = _find_price_in_json(obj)
                    if price is not None:
                        return price
                except json.JSONDecodeError:
                    pass
        except Exception:
            pass

    # Method 4: CSS selectors / microdata
    for selector in [
        "[data-locator='product-price-comparison']",  # per-linear-metre price on Bunnings
        "[itemprop='price']",
        "[data-locator='price-display']",
        "[data-testid='price-display']",
        "[data-testid='price']",
        ".price__value",
        ".pdp-price__value",
        "span[class*='Price']",
    ]:
        el = soup.select_one(selector)
        if el:
            content = el.get("content") or el.get_text(strip=True)
            m = re.search(r"[\d,]+\.\d{2}", content.replace("$", ""))
            if m:
                try:
                    return float(m.group().replace(",", ""))
                except ValueError:
                    pass

    return None


# ─── Scraping engines ──────────────────────────────────────────────────────────

def _debug_response(html: str, url: str) -> None:
    """Save full HTML to Desktop and print a diagnostic summary."""
    debug_file = Path.home() / "Desktop" / "bunnings_debug.html"
    debug_file.write_text(html, encoding="utf-8")
    logging.info("  DEBUG: Full page HTML saved to %s", debug_file)

    indicators = {
        "Cloudflare challenge":   any(p in html for p in ("Just a moment", "cf-browser-verification", "Checking your browser")),
        "Product name found":     any(p in html for p in ("Framing", "Treated Pine", "Blue Pine")),
        "__NEXT_DATA__ present":  '__NEXT_DATA__' in html,
        "Price symbol present":   "$" in html,
        "itemprop=price present": 'itemprop="price"' in html or "itemprop='price'" in html,
        "per linear metre":       "per linear metre" in html.lower(),
    }
    logging.info("  DEBUG indicators:")
    for label, found in indicators.items():
        logging.info("    %-30s %s", label, "YES" if found else "no")


def _scrape_with_curl_cffi(url: str, debug: bool = False) -> Optional[float]:
    """
    Uses curl_cffi to mimic Chrome's exact TLS fingerprint.
    This is the most reliable way to bypass Cloudflare.
    """
    try:
        resp = cffi_requests.get(
            url,
            impersonate="chrome131",
            timeout=20,
            headers={"Accept-Language": "en-AU,en;q=0.9"},
        )
        if resp.status_code in (403, 429, 503):
            logging.warning("  Blocked (HTTP %s) even with curl_cffi.", resp.status_code)
            if debug:
                _debug_response(resp.text, url)
            return None
        if not resp.ok:
            logging.warning("  HTTP %s", resp.status_code)
            return None
        if debug:
            _debug_response(resp.text, url)
        return _extract_price_from_html(resp.text)
    except Exception as exc:
        logging.warning("  curl_cffi error: %s", exc)
        return None


def _scrape_with_undetected_chrome(url: str) -> Optional[float]:
    """
    undetected_chromedriver patches Chrome at the binary level to hide all
    automation signals that Cloudflare looks for. Most reliable option.
    """
    try:
        options = uc.ChromeOptions()
        options.add_argument("--lang=en-AU")
        driver = uc.Chrome(headless=True, options=options, use_subprocess=True)
        try:
            driver.get(url)
            time.sleep(4)  # let JS render prices
            return _extract_price_from_html(driver.page_source)
        finally:
            driver.quit()
    except Exception as exc:
        logging.warning("  undetected-chromedriver error: %s", exc)
        return None


def _scrape_with_requests(url: str, session: std_requests.Session) -> Optional[float]:
    """Plain HTTP — often blocked by Cloudflare but kept as final fallback."""
    try:
        resp = session.get(url, headers=BROWSER_HEADERS, timeout=15)
        if not resp.ok:
            return None
        return _extract_price_from_html(resp.text)
    except std_requests.RequestException as exc:
        logging.warning("  Request error: %s", exc)
        return None


def scrape_bunnings_price(url: str, session: std_requests.Session, debug: bool = False) -> Optional[float]:
    length   = _length_from_url(url)   # e.g. 2.4 from "2-4m" in the URL
    url      = clean_url(url)          # keep ?store=, strip tracking junk

    piece_price: Optional[float] = None

    if CURL_CFFI_AVAILABLE:
        piece_price = _scrape_with_curl_cffi(url, debug=debug)

    if piece_price is None and UC_AVAILABLE:
        piece_price = _scrape_with_undetected_chrome(url)

    if piece_price is None:
        piece_price = _scrape_with_requests(url, session)

    if piece_price is None:
        return None

    # If the URL contains a length (e.g. 2.4m), the scraped value is the
    # total piece price — divide to get the per-linear-metre rate.
    if length and length > 0:
        per_lm = round(piece_price / length, 2)
        logging.info("  Piece price $%.2f ÷ %.1fm = $%.2f/lm", piece_price, length, per_lm)
        return per_lm

    return piece_price


# ─── Main logic ────────────────────────────────────────────────────────────────

def run(spreadsheet_path: Path, test_mode: bool = False, debug: bool = False) -> None:
    if not spreadsheet_path.exists():
        logging.error("Spreadsheet not found: %s", spreadsheet_path)
        sys.exit(1)

    engines = []
    if CURL_CFFI_AVAILABLE: engines.append("curl_cffi")
    if UC_AVAILABLE:        engines.append("undetected-chrome")
    engines.append("requests")

    logging.info("=" * 65)
    logging.info("Bunnings Price Updater — %s", datetime.now().strftime("%Y-%m-%d %H:%M"))
    if test_mode:
        logging.info("TEST MODE  (first %d URLs only)", TEST_LIMIT)
    logging.info("Engines: %s", " → ".join(engines))
    logging.info("Spreadsheet: %s", spreadsheet_path)
    logging.info("=" * 65)

    backup_spreadsheet(spreadsheet_path)

    wb = openpyxl.load_workbook(spreadsheet_path)

    if QUOTE_SHEET_NAME not in wb.sheetnames:
        logging.error(
            "Sheet '%s' not found. Sheets in this file: %s",
            QUOTE_SHEET_NAME, wb.sheetnames,
        )
        sys.exit(1)

    ws     = wb[QUOTE_SHEET_NAME]
    log_ws = get_or_create_log_sheet(wb)
    today  = date.today().isoformat()
    session = std_requests.Session()

    url_count = success = changed = failed = 0

    for row_idx in range(DATA_START_ROW, ws.max_row + 1):
        url = ws.cell(row=row_idx, column=URL_COLUMN).value
        if not url or not isinstance(url, str):
            continue
        url = url.strip()
        if not url.lower().startswith("http"):
            continue

        url_count += 1

        old_price_raw = ws.cell(row=row_idx, column=PRICE_COLUMN).value
        try:
            old_price: Optional[float] = float(old_price_raw) if old_price_raw is not None else None
        except (ValueError, TypeError):
            old_price = None

        desc = ws.cell(row=row_idx, column=1).value or ""
        logging.info("Row %d | %s", row_idx, url[:80])

        time.sleep(DELAY_SECONDS)
        # Only run debug on the very first URL (to avoid creating many files)
        new_price = scrape_bunnings_price(url, session, debug=(debug and url_count == 1))

        if new_price is None:
            failed += 1
            highlight_row(ws, row_idx, RED_FILL)
            log_ws.append([row_idx, str(desc), url, old_price, "FAILED", "N/A", today,
                           "FAILED — could not retrieve price"])
            logging.warning("  => FAILED  Row %d highlighted RED, price unchanged.", row_idx)
        else:
            success += 1
            ws.cell(row=row_idx, column=PRICE_COLUMN).value = new_price
            ws.cell(row=row_idx, column=DATE_COLUMN).value  = today

            price_changed = old_price is not None and abs(new_price - old_price) > 0.005
            change_amount = round(new_price - old_price, 2) if old_price is not None else "N/A"

            if price_changed:
                changed += 1
                highlight_row(ws, row_idx, YELLOW_FILL)
                status = f"CHANGED (was ${old_price:.2f})"
            else:
                highlight_row(ws, row_idx, NO_FILL)
                status = "UNCHANGED"

            log_ws.append([row_idx, str(desc), url, old_price, new_price, change_amount,
                           today, status])
            logging.info("  => $%.2f  (was %s)  [%s]",
                         new_price,
                         f"${old_price:.2f}" if old_price is not None else "unknown",
                         status)

        if test_mode and url_count >= TEST_LIMIT:
            logging.info("Test mode complete — processed %d URLs.", url_count)
            break

    save_workbook(wb, spreadsheet_path)

    logging.info("=" * 65)
    logging.info("Done.  Checked: %d  |  Updated: %d  |  Changed: %d  |  Failed: %d",
                 url_count, success, changed, failed)
    logging.info("=" * 65)


def main() -> None:
    parser = argparse.ArgumentParser(description="Update Bunnings prices in Price Book.xlsx")
    parser.add_argument("spreadsheet", nargs="?", default="Price Book.xlsx")
    parser.add_argument("--test", action="store_true",
                        help=f"Only process first {TEST_LIMIT} URLs")
    parser.add_argument("--debug", action="store_true",
                        help="Save the raw HTML from the first URL to Desktop for diagnosis")
    args = parser.parse_args()

    spreadsheet_path = Path(args.spreadsheet)
    if not spreadsheet_path.is_absolute() and not spreadsheet_path.exists():
        candidate = Path(__file__).parent / spreadsheet_path
        if candidate.exists():
            spreadsheet_path = candidate

    log_file = Path.home() / "Desktop" / "price_updater.log"
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s  %(levelname)-8s  %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler(log_file, encoding="utf-8"),
        ],
    )

    run(spreadsheet_path, test_mode=args.test, debug=args.debug)


if __name__ == "__main__":
    main()
