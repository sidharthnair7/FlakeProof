"""Paths, constants and environment. Everything filesystem-y or secret lives here so nothing
else hardcodes a path or reads os.environ directly.

Settings come from (highest priority first): real environment variables, then a `.env` file in
the repo root, then the defaults below. Nothing here is required just to *replay* recorded runs
on the dashboard; the Java toolchain and model credentials are only needed to run the agent.
"""
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WORKDIR = ROOT / "workdir"       # cloned Java projects land here (gitignored)
DATA = ROOT / "data"             # sqlite lives here (gitignored)


def _load_dotenv(path: Path = ROOT / ".env") -> None:
    """Minimal KEY=VALUE loader. Never overrides a variable that is already set."""
    if not path.exists():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key, value = key.strip(), value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


_load_dotenv()

DB_PATH = Path(os.environ.get("FLAKEPROOF_DB", DATA / "runs.db"))

# ---- Java toolchain (only needed to run the agent, not the dashboard) ----------------------
# Targets build on JDK 11 and fail on the default JDK 25.
JAVA_HOME = os.environ.get("FLAKEPROOF_JAVA_HOME", r"C:\Program Files\Java\jdk-11")
# Absolute + forward slashes so subprocess never depends on shell PATH.
MVN = os.environ.get("FLAKEPROOF_MVN", "C:/Users/sidhu/tools/apache-maven-3.9.16/bin/mvn.cmd")
MVN_TIMEOUT_SECONDS = int(os.environ.get("FLAKEPROOF_MVN_TIMEOUT", "600"))

# Column name in idoft-shortlist.csv. Long enough to be worth a constant.
TEST_NAME_COL = "Fully-Qualified Test Name (packageName.ClassName.methodName)"

# ---- The gate ------------------------------------------------------------------------------
DEFAULT_RERUNS = int(os.environ.get("FLAKEPROOF_RERUNS", "200"))   # Blade 1 sample size
BASELINE_RUNS = int(os.environ.get("FLAKEPROOF_BASELINE", "20"))   # before-fix measurement
# The model's opinion alone can refuse a patch only above this confidence. The deterministic
# scanner needs no confidence: a rule hit is a refusal.
BANDAID_MODEL_THRESHOLD = float(os.environ.get("FLAKEPROOF_BANDAID_THRESHOLD", "0.7"))

# ---- Model provider ------------------------------------------------------------------------
# bedrock  : Amazon Bedrock via the Strands BedrockModel (the submission configuration)
# anthropic: Anthropic API directly (development fallback; needs `pip install anthropic`)
# none     : no model. The deterministic parts (harness, scanner, planted candidates) still run.
PROVIDER = os.environ.get("FLAKEPROOF_PROVIDER", "bedrock").lower()
MODEL_ID = os.environ.get("FLAKEPROOF_MODEL_ID") or None     # None -> the provider's default
AWS_REGION = os.environ.get("AWS_REGION") or os.environ.get("AWS_DEFAULT_REGION") or "us-east-1"

# ---- GitHub (the PR is the product's real-world side effect) --------------------------------
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN") or ""
GITHUB_OWNER = os.environ.get("FLAKEPROOF_GITHUB_OWNER", "sidharthnair7")   # where the fork lives
GITHUB_API = "https://api.github.com"

# ---- "Try the gate" backend ----------------------------------------------------------------
# local     : judge patches in-process (scanner + one model call)
# agentcore : forward to a deployed Amazon Bedrock AgentCore Runtime (see DEPLOY.md)
GATE_BACKEND = os.environ.get("FLAKEPROOF_GATE_BACKEND", "local").lower()
AGENTCORE_RUNTIME_ARN = os.environ.get("FLAKEPROOF_AGENTCORE_ARN", "")

# Public URL of the dashboard, embedded in PR bodies so reviewers can click through to evidence.
DASHBOARD_URL = os.environ.get("FLAKEPROOF_DASHBOARD_URL", "")
