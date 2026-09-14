"""Only a test class or Class#method may reach Maven's command line, and agents may not write under .git."""
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from agent import harness, repo as repo_ops


class Selector(unittest.TestCase):
    def test_real_selectors_pass(self):
        for selector in ["AISMessageFactoryTest",
                         "SentenceFactoryTest#testRegisterParserWithAlternativeBeginChar",
                         "net.sf.marineapi.nmea.parser.SentenceFactoryTest#testRegisterParserWithAlternativeBeginChar",
                         "Outer$InnerTest#testSomething"]:
            self.assertTrue(harness.valid_selector(selector), selector)

    def test_shell_metacharacters_are_rejected(self):
        for selector in ["X#x&echo.INJECTED", "X#x|calc", "X#x^&y", "X#x\n", "X#x y", "X#x>out", "X#", ""]:
            self.assertFalse(harness.valid_selector(selector), repr(selector))

    def test_maven_is_never_called_with_an_unsafe_selector(self):
        with tempfile.TemporaryDirectory() as tmp, mock.patch.object(repo_ops, "mvn") as mvn:
            with self.assertRaises(ValueError):
                harness.run_suite_once(Path(tmp), "com.example.VictimTest", "alphabetical", scope="X#x&calc")
            mvn.assert_not_called()


class RepositoryPaths(unittest.TestCase):
    def test_git_directory_and_outside_paths_are_off_limits(self):
        with tempfile.TemporaryDirectory() as tmp:
            repo = Path(tmp)
            with self.assertRaises(ValueError):
                repo_ops.write_file(repo, ".git/config", "[core]\n")
            with self.assertRaises(ValueError):
                repo_ops.write_file(repo, "../outside.txt", "x")
            repo_ops.write_file(repo, "src/Foo.java", "class Foo {}")
            self.assertTrue((repo / "src" / "Foo.java").exists())

    def test_search_stays_inside_the_repository(self):
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaises(ValueError):
                repo_ops.grep(Path(tmp), "x", subdir="../..")


if __name__ == "__main__":
    unittest.main()
