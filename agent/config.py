"""Paths and constants. Everything filesystem-y lives here so nothing else hardcodes a path."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WORKDIR = ROOT / "workdir"       # cloned Java projects land here (gitignored)
DATA = ROOT / "data"             # sqlite lives here (gitignored)
DB_PATH = DATA / "runs.db"

# Build the Java targets with JDK 11, not the default 25.
JAVA_HOME = r"C:\Program Files\Java\jdk-11"

# Column name in idoft-shortlist.csv. Long enough to be worth a constant.
TEST_NAME_COL = "Fully-Qualified Test Name (packageName.ClassName.methodName)"

DEFAULT_RERUNS = 200
MVN_TIMEOUT_SECONDS = 600

# Maven executable. Absolute + forward slashes so subprocess never depends on shell PATH
# and nothing has to survive backslash escaping.
MVN = "C:/Users/sidhu/tools/apache-maven-3.9.16/bin/mvn.cmd"
