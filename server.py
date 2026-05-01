from __future__ import annotations

import json
import mimetypes
import os
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from bazi_engine import calculate_bazi, calculate_bazi_by_pillars


ROOT = Path(__file__).resolve().parent


class AppHandler(SimpleHTTPRequestHandler):
    STATIC_CACHE_SECONDS = 60 * 60 * 24 * 30

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self) -> None:
        if self.path == "/":
            self.path = "/index.html"
        elif self.path in {"/home.html", "/app.html", "/site.html", "/main.html"}:
            self.path = "/index.html"
        elif self.path == "/healthz":
            body = b"ok"
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def do_POST(self) -> None:
        if self.path not in {"/api/bazi", "/api/bazi-direct"}:
            self.send_error(HTTPStatus.NOT_FOUND, "Not Found")
            return

        try:
            content_length = int(self.headers.get("Content-Length", "0"))
            raw = self.rfile.read(content_length)
            payload = json.loads(raw.decode("utf-8"))
            result = calculate_bazi(payload) if self.path == "/api/bazi" else calculate_bazi_by_pillars(payload)
            body = json.dumps(result, ensure_ascii=False).encode("utf-8")
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        except Exception as exc:  # pragma: no cover
            body = json.dumps({"error": str(exc)}, ensure_ascii=False).encode("utf-8")
            self.send_response(HTTPStatus.BAD_REQUEST)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

    def do_OPTIONS(self) -> None:
        if self.path.startswith("/api/"):
            self.send_response(HTTPStatus.NO_CONTENT)
            self.send_header("Content-Length", "0")
            self.end_headers()
            return
        self.send_error(HTTPStatus.NOT_FOUND, "Not Found")

    def end_headers(self) -> None:
        cache_control = self._cache_control_for_path(self.path)
        if cache_control:
            self.send_header("Cache-Control", cache_control)
        if self.path.startswith("/api/"):
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        super().end_headers()

    def _cache_control_for_path(self, path: str) -> str | None:
        clean_path = path.split("?", 1)[0]
        if clean_path in {"/", "/index.html", "/calculator.html", "/result-preview.html"}:
            return "no-cache"
        if clean_path.startswith("/api/") or clean_path == "/healthz":
            return None

        guessed_type = mimetypes.guess_type(clean_path)[0] or ""
        if clean_path.startswith("/static/") or guessed_type.startswith(("text/css", "application/javascript", "image/", "font/")):
            return f"public, max-age={self.STATIC_CACHE_SECONDS}, immutable"
        return "public, max-age=3600"


def main() -> None:
    host = os.environ.get("HOST", "127.0.0.1")
    port = int(os.environ.get("PORT", "8000"))
    server = ThreadingHTTPServer((host, port), AppHandler)
    print(f"Serving on http://{host}:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
