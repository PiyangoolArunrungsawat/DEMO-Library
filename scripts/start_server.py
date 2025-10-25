#!/usr/bin/env python3
"""Launch a tiny static web server for the Manga Reader demo."""

import contextlib
import http.server
import socket
import socketserver
import sys
import threading
import webbrowser
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
ROOT = SCRIPT_DIR.parent
WEB_DIR = ROOT / "web"
DEFAULT_PORT = 8000
MAX_PORT_ATTEMPTS = 30


def find_free_port(start: int = DEFAULT_PORT, attempts: int = MAX_PORT_ATTEMPTS) -> int:
    """Find the first available port starting from `start`."""
    for port in range(start, start + attempts):
        with contextlib.closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as sock:
            if sock.connect_ex(("127.0.0.1", port)) != 0:
                return port
    raise OSError("No free port found for the web server.")


class SilentRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Serve files from WEB_DIR without noisy logging."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(WEB_DIR), **kwargs)

    def log_message(self, fmt: str, *args) -> None:
        pass  # Keep the console clean; comment out to debug HTTP requests.


def main() -> int:
    if not WEB_DIR.exists():
        print(f"[ERROR] Cannot find web directory at: {WEB_DIR}", file=sys.stderr)
        return 1

    try:
        port = find_free_port()
    except OSError as exc:
        print(f"[ERROR] {exc}", file=sys.stderr)
        return 1

    url = f"http://127.0.0.1:{port}/"

    with socketserver.ThreadingTCPServer(("127.0.0.1", port), SilentRequestHandler) as httpd:
        httpd.daemon_threads = True
        print(f"Serving '{WEB_DIR}' at {url}")
        print("Press Ctrl+C (or close this window) to stop the server.")

        try:
            threading.Timer(1.0, lambda: webbrowser.open(url, new=1)).start()
        except Exception as exc:  # noqa: BLE001 - best effort to open a browser
            print(f"[WARN] Could not open the browser automatically: {exc}")

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nStopping server…")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
