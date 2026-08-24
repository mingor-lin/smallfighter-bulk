#!/usr/bin/env python3
"""Local tests for the parameterized history-sync client."""

from __future__ import annotations

import http.server
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import threading
import unittest


ROOT = Path(__file__).resolve().parent
SCRIPT = ROOT / "history_sync.py"


class MockHandler(http.server.BaseHTTPRequestHandler):
    requests: list[tuple[str, dict[str, str], dict[str, object] | None]] = []

    def log_message(self, *_args: object) -> None:
        return

    def _write(self, status: int, body: dict[str, object]) -> None:
        encoded = json.dumps(body, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def do_GET(self) -> None:  # noqa: N802
        MockHandler.requests.append((self.path, dict(self.headers), None))
        if self.path == "/admin/api/auth/session":
            self._write(200, {"code": 0, "data": {"status": True}})
            return
        self._write(404, {"code": 404, "message": "not found"})

    def do_POST(self) -> None:  # noqa: N802
        size = int(self.headers.get("Content-Length", "0"))
        body = json.loads(self.rfile.read(size).decode("utf-8"))
        MockHandler.requests.append((self.path, dict(self.headers), body))
        self._write(
            201,
            {
                "code": 0,
                "data": {
                    "published": True,
                    "taskId": "mock-task-1",
                    "validAccountIds": [],
                    "payload": body,
                },
            },
        )


class HistorySyncTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        MockHandler.requests = []
        cls.server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), MockHandler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls) -> None:
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=2)

    def setUp(self) -> None:
        MockHandler.requests.clear()
        self.tempdir = tempfile.TemporaryDirectory()
        self.addCleanup(self.tempdir.cleanup)
        root = Path(self.tempdir.name)
        self.config = root / "config.json"
        self.config.write_text(
            json.dumps(
                {
                    "base_url": f"http://127.0.0.1:{self.server.server_port}",
                    "cookies": {"_aproxySID": "aproxy-test", "admin.sid": "admin-test"},
                    "timeout_seconds": 3,
                    "dedupe_file": str(root / "dedupe.json"),
                }
            ),
            encoding="utf-8",
        )

    def run_cli(self, *args: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [sys.executable, str(SCRIPT), "--config", str(self.config), *args],
            check=False,
            capture_output=True,
            text=True,
        )

    def test_media_and_preview_do_not_call_remote(self) -> None:
        result = self.run_cli(
            "preview",
            "--media",
            "巨量引擎",
            "--project-id",
            "131744",
            "--start-date",
            "20260824",
            "--end-date",
            "20260824",
            "--json",
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(MockHandler.requests, [])
        parsed = json.loads(result.stdout)
        self.assertEqual(parsed["payload"]["adxId"], 10006)
        self.assertEqual(parsed["payload"]["projectId"], 131744)

    def test_execute_and_request_key_dedupe(self) -> None:
        args = (
            "execute",
            "--media",
            "10006",
            "--report-type",
            "REPORT",
            "--project-id",
            "131744",
            "--start-date",
            "20260824",
            "--end-date",
            "20260824",
            "--request-key",
            "message-1",
            "--confirm",
            "确认执行历史同步",
            "--json",
        )
        first = self.run_cli(*args)
        self.assertEqual(first.returncode, 0, first.stderr)
        second = self.run_cli(*args)
        self.assertEqual(second.returncode, 0, second.stderr)
        posts = [item for item in MockHandler.requests if item[0].endswith("history-sync")]
        self.assertEqual(len(posts), 1)
        self.assertFalse(json.loads(first.stdout)["deduplicated"])
        self.assertTrue(json.loads(second.stdout)["deduplicated"])
        self.assertNotIn("aproxy-test", first.stdout)
        self.assertNotIn("admin-test", first.stdout)

    def test_execute_requires_exact_confirmation(self) -> None:
        result = self.run_cli(
            "execute",
            "--media",
            "巨量引擎",
            "--project-id",
            "131744",
            "--start-date",
            "20260824",
            "--end-date",
            "20260824",
            "--confirm",
            "确认",
        )
        self.assertEqual(result.returncode, 2)
        self.assertEqual(MockHandler.requests, [])

    def test_invalid_date_and_missing_scope_are_rejected(self) -> None:
        invalid_date = self.run_cli(
            "preview",
            "--media",
            "巨量引擎",
            "--start-date",
            "20260824",
            "--end-date",
            "20260823",
        )
        self.assertEqual(invalid_date.returncode, 2)
        missing_scope = self.run_cli(
            "preview",
            "--media",
            "巨量引擎",
            "--start-date",
            "20260824",
            "--end-date",
            "20260824",
        )
        self.assertEqual(missing_scope.returncode, 2)
        self.assertEqual(MockHandler.requests, [])


if __name__ == "__main__":
    unittest.main()
