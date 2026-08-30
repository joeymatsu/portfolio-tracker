#!/usr/bin/env python3
"""Tiny no-key quote proxy + static server for Portfolio Tracker.
For personal/research use. Data providers may change endpoints/terms.
"""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs, quote
from urllib.request import Request, urlopen
from pathlib import Path
import json, re, html, time, os

ROOT = Path(__file__).resolve().parent
PORT = int(os.environ.get("PORT", "8000"))
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36"

def fetch(url, timeout=12):
    req = Request(url, headers={"User-Agent": UA, "Accept-Language": "ja,en-US;q=0.8,en;q=0.7"})
    with urlopen(req, timeout=timeout) as r:
        return r.read()

def yahoo_chart(symbol):
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{quote(symbol)}?interval=1d&range=5d"
    data = json.loads(fetch(url).decode("utf-8"))
    result = data["chart"]["result"][0]
    meta = result.get("meta", {})
    price = meta.get("regularMarketPrice")
    if price is None:
        closes = result.get("indicators", {}).get("quote", [{}])[0].get("close", [])
        price = next((x for x in reversed(closes) if x is not None), None)
    if price is None:
        raise ValueError("No market price found")
    currency = meta.get("currency") or ("JPY" if symbol.endswith(".T") else "USD")
    ts = meta.get("regularMarketTime")
    return {
        "price": float(price),
        "currency": currency,
        "name": meta.get("longName") or meta.get("shortName"),
        "asOf": ts,
        "source": "Yahoo Finance",
        "symbol": symbol,
    }

def yahoo_jp_fund(code):
    # Yahoo! Finance Japan fund pages expose the latest NAV in server-rendered/embedded content.
    url = f"https://finance.yahoo.co.jp/quote/{quote(code)}"
    raw = fetch(url).decode("utf-8", errors="ignore")
    text = html.unescape(raw)

    patterns = [
        r'"regularMarketPrice"\s*:\s*\{?\s*"raw"\s*:\s*([0-9.]+)',
        r'"regularMarketPrice"\s*:\s*([0-9.]+)',
        r'"price"\s*:\s*\{?\s*"value"\s*:\s*([0-9.]+)',
        r'基準価額.{0,500}?([0-9]{1,3}(?:,[0-9]{3})+)',
    ]
    price = None
    for pattern in patterns:
        m = re.search(pattern, text, flags=re.S)
        if m:
            price = float(m.group(1).replace(",", ""))
            break
    if price is None:
        raise ValueError("Could not locate NAV on Yahoo Japan fund page")

    name = None
    for pattern in [r'<title>(.*?)\s*[-｜|].*?</title>', r'<h1[^>]*>(.*?)</h1>']:
        m = re.search(pattern, text, flags=re.S|re.I)
        if m:
            name = re.sub(r'<[^>]+>', '', m.group(1)).strip()
            if name: break
    return {"price": price, "currency": "JPY", "name": name, "asOf": int(time.time()), "source": "Yahoo!ファイナンス", "symbol": code}

class Handler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        parsed = urlparse(path).path
        rel = parsed.lstrip('/') or 'index.html'
        return str(ROOT / rel)

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        super().end_headers()

    def send_json(self, payload, status=200):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        u = urlparse(self.path)
        if u.path == "/health":
            return self.send_json({"ok": True})
        if u.path == "/api/quote":
            q = parse_qs(u.query)
            ticker = (q.get("ticker", [""])[0] or "").strip().upper()
            market = (q.get("market", ["US"])[0] or "US").upper()
            asset = (q.get("assetType", ["Stock"])[0] or "Stock")
            if not ticker:
                return self.send_json({"error":"ticker is required"}, 400)
            try:
                if market == "JP" and asset == "Mutual Fund":
                    result = yahoo_jp_fund(ticker)
                else:
                    symbol = ticker
                    if market == "JP" and re.fullmatch(r"\d{4}", ticker):
                        symbol += ".T"
                    result = yahoo_chart(symbol)
                return self.send_json(result)
            except Exception as e:
                return self.send_json({"error": str(e), "ticker": ticker}, 502)
        return super().do_GET()

if __name__ == "__main__":
    os.chdir(ROOT)
    print(f"Portfolio Tracker: http://localhost:{PORT}")
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
