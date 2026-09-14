"""A pull request must change only the patched lines: files are uploaded exactly as git stores them."""
import subprocess
import tempfile
import unittest
from pathlib import Path

from agent import github


def git(repo: Path, *args: str) -> None:
    subprocess.run(["git", "-c", "user.name=test", "-c", "user.email=test@example.com", *args],
                   cwd=repo, check=True, capture_output=True)


class CommittableBytes(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(ignore_cleanup_errors=True)
        self.repo = Path(self.tmp.name)
        git(self.repo, "init", "-q")
        git(self.repo, "config", "core.autocrlf", "false")
        (self.repo / "FooTest.java").write_bytes(b"class FooTest {\r\n  void a() {}\r\n}\r\n")
        git(self.repo, "add", ".")
        git(self.repo, "commit", "-q", "-m", "init")

    def tearDown(self):
        self.tmp.cleanup()

    def test_a_crlf_file_keeps_its_line_endings(self):
        patched = b"class FooTest {\r\n  void a() {}\r\n  void b() {}\r\n}\r\n"
        (self.repo / "FooTest.java").write_bytes(patched)
        self.assertEqual(github._committable_bytes(self.repo, ["FooTest.java"]), {"FooTest.java": patched})

    def test_a_new_file_is_included(self):
        (self.repo / "BarTest.java").write_bytes(b"class BarTest {}\n")
        self.assertEqual(github._committable_bytes(self.repo, ["BarTest.java"]),
                         {"BarTest.java": b"class BarTest {}\n"})


if __name__ == "__main__":
    unittest.main()
