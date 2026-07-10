#!/usr/bin/env python3
"""Export every Intercom conversation, with full message threads, to JSONL.

    INTERCOM_ACCESS_TOKEN=xxxxx python3 intercom_export.py

Env:
    INTERCOM_ACCESS_TOKEN   required, read-only token
    INTERCOM_VERSION        default 2.11
    INTERCOM_MAX            stop after N conversations (smoke test; e.g. 5)

Writes intercom-conversations.jsonl (append) and .intercom-cursor (resume point).
Safe to re-run: already-exported conversation ids are skipped.

The list endpoint omits message bodies, so each conversation is fetched
individually. That is the slow part and it is not optional.
"""

import html
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

TOKEN = os.environ.get("INTERCOM_ACCESS_TOKEN")
VERSION = os.environ.get("INTERCOM_VERSION", "2.11")
MAX = int(os.environ.get("INTERCOM_MAX", "0"))

if not TOKEN:
    sys.exit("Set INTERCOM_ACCESS_TOKEN (use a read-only token, not the production one).")

OUT = "intercom-conversations.jsonl"
CURSOR_FILE = ".intercom-cursor"
HEADERS = {
    "Authorization": "Bearer " + TOKEN,
    "Intercom-Version": VERSION,
    "Accept": "application/json",
}

_TAG = re.compile(r"<[^>]+>")
_BREAK = re.compile(r"<br\s*/?>|</(?:p|div|li|h[1-6])>", re.I)
_BLANK = re.compile(r"\n{3,}")


def strip_html(raw):
    """Message bodies are HTML; flatten to readable plain text."""
    if not raw:
        return ""
    text = _BREAK.sub("\n", raw)
    text = _TAG.sub("", text)
    return _BLANK.sub("\n\n", html.unescape(text)).strip()


def api(url):
    """GET with retry on 429 (rate limit) and 5xx (transient)."""
    for attempt in range(8):
        req = urllib.request.Request(url, headers=HEADERS)
        try:
            with urllib.request.urlopen(req, timeout=60) as res:
                return json.load(res)
        except urllib.error.HTTPError as e:
            if e.code == 401:
                sys.exit("401 Unauthorized — check the token and its scopes.")
            if e.code == 429 or e.code >= 500:
                wait = 2 * (attempt + 1)
                print("  %s — retrying in %ss" % (e.code, wait), file=sys.stderr)
                time.sleep(wait)
                continue
            raise
        except urllib.error.URLError as e:
            wait = 2 * (attempt + 1)
            print("  network error (%s) — retrying in %ss" % (e.reason, wait), file=sys.stderr)
            time.sleep(wait)
    raise RuntimeError("giving up after 8 attempts: " + url)


def fetch_full(cid):
    c = api("https://api.intercom.io/conversations/" + str(cid))
    messages = []

    source = c.get("source") or {}
    if source.get("body"):
        author = source.get("author") or {}
        messages.append({
            "author": author.get("type") or "user",
            "name": author.get("name"),
            "body": strip_html(source["body"]),
            "at": c.get("created_at"),
        })

    parts = (c.get("conversation_parts") or {}).get("conversation_parts") or []
    for p in parts:
        if not p.get("body"):
            continue  # close/assign/note events carry no text
        author = p.get("author") or {}
        messages.append({
            "author": author.get("type"),
            "name": author.get("name"),
            "body": strip_html(p["body"]),
            "at": p.get("created_at"),
        })

    return {
        "id": c.get("id"),
        "created_at": c.get("created_at"),
        "subject": strip_html(source.get("subject") or ""),
        "messages": messages,
    }


def load_done():
    seen = set()
    if not os.path.exists(OUT):
        return seen
    with open(OUT, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                seen.add(json.loads(line)["id"])
            except (ValueError, KeyError):
                pass
    print("Resuming — %d conversations already exported." % len(seen))
    return seen


def main():
    done = load_done()
    cursor = None
    if os.path.exists(CURSOR_FILE):
        cursor = open(CURSOR_FILE, encoding="utf-8").read().strip() or None

    total = 0
    page = 0
    oldest = None
    newest = None

    with open(OUT, "a", encoding="utf-8") as out:
        while True:
            params = {"per_page": "150"}  # 150 is Intercom's documented max
            if cursor:
                params["starting_after"] = cursor
            listing = api("https://api.intercom.io/conversations?" + urllib.parse.urlencode(params))

            for conv in listing.get("conversations") or []:
                if conv["id"] in done:
                    continue
                try:
                    full = fetch_full(conv["id"])
                except Exception as e:  # one bad conversation must not kill the run
                    print("  skip %s: %s" % (conv["id"], e), file=sys.stderr)
                    continue

                out.write(json.dumps(full, ensure_ascii=False) + "\n")
                out.flush()
                total += 1

                ts = full.get("created_at")
                if ts:
                    oldest = ts if oldest is None else min(oldest, ts)
                    newest = ts if newest is None else max(newest, ts)
                if total % 50 == 0:
                    print("  …%d new conversations exported" % total)
                if MAX and total >= MAX:
                    print("\nINTERCOM_MAX=%d reached — stopping (smoke test)." % MAX)
                    summarize(total, oldest, newest)
                    return

                time.sleep(0.12)  # ~8 req/s, well under Intercom's limit

            cursor = ((listing.get("pages") or {}).get("next") or {}).get("starting_after")
            page += 1
            print("page %d done; cursor %s" % (page, "advanced" if cursor else "END"))
            if not cursor:
                break
            with open(CURSOR_FILE, "w", encoding="utf-8") as fh:
                fh.write(cursor)

    summarize(total, oldest, newest)


def summarize(total, oldest, newest):
    print("\nWrote %d new conversations to %s" % (total, OUT))
    if oldest and newest:
        fmt = lambda t: time.strftime("%Y-%m-%d", time.localtime(t))
        print("Date range in this run: %s → %s" % (fmt(oldest), fmt(newest)))
        age_days = (time.time() - oldest) / 86400
        print("Oldest conversation is %d days old (~%.1f years)." % (age_days, age_days / 365))
        if age_days < 700:
            print("NOTE: nothing older than ~2 years came back. Intercom retains export\n"
                  "      data for two years, so anything before that is likely already gone.")


if __name__ == "__main__":
    main()
