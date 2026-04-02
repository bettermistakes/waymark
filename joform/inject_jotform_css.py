#!/usr/bin/env python3
"""
Embed jotform.css into Get_in_Touch.html inside <style id="form-designer-style">.

Edit only jotform.css, then run:
  python3 inject_jotform_css.py

On Jotform live (no HTML access): paste the contents of jotform.css into
Form Settings → Custom CSS — same source of truth as this file.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

DIR = Path(__file__).resolve().parent
HTML_FILE = DIR / "Get_in_Touch.html"
CSS_FILE = DIR / "jotform.css"

STYLE_OPEN = '<style type="text/css" id="form-designer-style">'
LINK_PATTERN = re.compile(
    r'<link[^>]*\bid="form-designer-style"[^>]*/>',
    re.IGNORECASE | re.DOTALL,
)
STYLE_BLOCK_PATTERN = re.compile(
    STYLE_OPEN + r".*?" + r"</style>",
    re.DOTALL | re.IGNORECASE,
)


def main() -> int:
    if not CSS_FILE.is_file():
        print(f"Missing {CSS_FILE}", file=sys.stderr)
        return 1
    if not HTML_FILE.is_file():
        print(f"Missing {HTML_FILE}", file=sys.stderr)
        return 1

    raw = CSS_FILE.read_text(encoding="utf-8")
    lines = raw.splitlines()
    non_empty = [ln for ln in lines if ln.strip()]
    if non_empty:
        min_indent = min(len(ln) - len(ln.lstrip(" \t")) for ln in non_empty)
        lines = [ln[min_indent:] if len(ln) >= min_indent else ln for ln in lines]
    css = "\n".join(lines).rstrip() + "\n"
    # Escape accidental </style> in CSS (breaks HTML if present)
    if "</style>" in css.lower():
        print("Warning: jotform.css contains '</style>' — fix or split rules.", file=sys.stderr)

    inner = "\n".join("    " + line if line else "" for line in css.splitlines()) + "\n"
    block = STYLE_OPEN + "\n" + inner + "</style>"

    html = HTML_FILE.read_text(encoding="utf-8")

    if LINK_PATTERN.search(html):
        new_html = LINK_PATTERN.sub(block, html, count=1)
    elif STYLE_BLOCK_PATTERN.search(html):
        new_html = STYLE_BLOCK_PATTERN.sub(block, html, count=1)
    else:
        print(
            f"Could not find {STYLE_OPEN!r} block or form-designer-style link in {HTML_FILE}",
            file=sys.stderr,
        )
        return 1

    if new_html == html:
        print("No change written (pattern matched but content identical?).")
        return 0

    HTML_FILE.write_text(new_html, encoding="utf-8")
    print(f"Updated {HTML_FILE} from {CSS_FILE}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
