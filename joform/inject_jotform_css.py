#!/usr/bin/env python3
"""
Keep Get_in_Touch.html using only <link href="jotform.css"> — no inline CSS.

Edit jotform.css, then run:
  python3 inject_jotform_css.py

This script removes any <style id="form-designer-style"> block (e.g. from a fresh
Jotform export) and ensures a single link to jotform.css after the payment CSS.

On Jotform live: paste jotform.css into Form Settings → Custom CSS.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

DIR = Path(__file__).resolve().parent
HTML_FILE = DIR / "Get_in_Touch.html"
CSS_FILE = DIR / "jotform.css"

INLINE_FORM_STYLE = re.compile(
    r'<style\s+type="text/css"\s+id="form-designer-style"\s*>.*?</style>\s*',
    re.DOTALL | re.IGNORECASE,
)
JOTFORM_LINK = re.compile(
    r'<link[^>]*href=["\']jotform\.css["\'][^>]*/\s*>',
    re.IGNORECASE | re.DOTALL,
)
LINK_SNIPPET = '<link type="text/css" rel="stylesheet" href="jotform.css" />\n'
AFTER_PAYMENT_FEATURE = re.compile(
    r'(<link[^>]*payment_feature\.css[^>]*/>\s*)',
    re.IGNORECASE | re.DOTALL,
)


def main() -> int:
    if not CSS_FILE.is_file():
        print(f"Missing {CSS_FILE}", file=sys.stderr)
        return 1
    if not HTML_FILE.is_file():
        print(f"Missing {HTML_FILE}", file=sys.stderr)
        return 1

    html = HTML_FILE.read_text(encoding="utf-8")
    new_html = INLINE_FORM_STYLE.sub("", html)

    if not JOTFORM_LINK.search(new_html):
        m = AFTER_PAYMENT_FEATURE.search(new_html)
        if not m:
            print(
                f"Could not find payment_feature.css link to insert jotform.css after in {HTML_FILE}",
                file=sys.stderr,
            )
            return 1
        new_html = AFTER_PAYMENT_FEATURE.sub(r"\1" + LINK_SNIPPET, new_html, count=1)

    if new_html == html:
        print("No change needed (link present, no inline form-designer-style).")
        return 0

    HTML_FILE.write_text(new_html, encoding="utf-8")
    print(f"Updated {HTML_FILE} (link-only; removed inline #form-designer-style if any).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
