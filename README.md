# Flakeproof

**An agent that repairs flaky tests, and refuses to open a pull request for any fix it cannot prove.**

Built with **Strands Agents** on **Amazon Bedrock** (Amazon Nova 2 Lite) for the AWS Agents for Humans Hackathon.

![Built with Strands Agents](https://img.shields.io/badge/built%20with-Strands%20Agents-2563eb)
![Amazon Bedrock](https://img.shields.io/badge/Amazon%20Bedrock-Nova%202%20Lite-ff9900)
![Python 3.12](https://img.shields.io/badge/python-3.12-3776ab)
![Unit tests](https://img.shields.io/badge/unit%20tests-23%20passing-16a34a)
![License: MIT](https://img.shields.io/badge/license-MIT-16a34a)

---

## The 30-second version

- A **flaky test** passes and fails on the same code. Somebody has to triage it, find the cause, fix it, and convince reviewers the fix holds.
- Automated repair exists, but trust is the bottleneck: FlakyGuard repairs 47.6% of reproducible flaky tests, and **developers accept 51.8% of those fixes** ([Li et al., arXiv 2511.14002](https://arxiv.org/abs/2511.14002)).
- A `Thread.sleep`, a retry or an `@Ignore` can turn a flaky test green without fixing anything. A gate built only from reruns would approve all of them.
- **Flakeproof is a Strands Agents graph where agents diagnose and write fixes, and a deterministic gate decides.** A fix is VERIFIED only if it passes every rerun under rotating test orders **and** contains no band-aid.
- In our demo run, an `@Ignore` band-aid passed **30 of 30** reruns. **The gate refused it anyway** and named line 220.
- In the agents' first full run, our own repair agent wrote a wrong fix that the model reviewer rated **95% likely to be real**. The gate refused that too.
- After we fixed one tool, the agents found the polluting test with **a single experiment** and wrote a fix **the gate verified**.

![Flakeproof architecture](docs/architecture.png)

---

## Who it's for

Engineering teams running Java test suites in CI, and specifically whoever is on flaky-test duty this week. The job has five steps: read the red build, decide whether it is real or noise, find the cause, fix it, and convince the team the fix holds. Flakeproof does all five, and it does the last one with **evidence attached to the pull request** instead of a reviewer's trust.

**Scope, stated plainly:** Flakeproof handles **order-dependent** flaky tests, where one test leaves shared state dirty and a later test fails because of it. Those reproduce deterministically by controlling test order, so hundreds of clean reruns are real evidence. It does not handle async-wait or concurrency flakes, where reruns alone would not be proof.

---

## How it works

### The pipeline: one Strands Graph, agents and proof engine in the same orchestration

| Node | Type | What it does |
|---|---|---|
| `intake` | deterministic | Reruns the failing test under rotating Surefire orders to measure a baseline and capture a failure trace |
| `diagnose` | **Strands Swarm**, 4 agents | Triage, order-dependence, async and resource specialists hand the case to each other and record hypotheses with evidence |
| `synthesize` | agent | Weighs the hypotheses and records one diagnosis: category, root cause, polluter, fix strategy |
| `repair` | agent | Edits the code, compiles, and snapshots each fix as a candidate patch |
| `gate` | deterministic | Judges every candidate with both blades (below) |
| `open_pr` | agent | The only node with the pull-request tool. Reachable only through the edge whose condition is "the gate verified a candidate" |
| `refuse` | deterministic | Runs when no candidate is verified: states the verdict, the failing blade and the offending line. No pull request |

**8 LLM agents** (4 in the swarm, synthesizer, repair, PR writer, band-aid judge), **3 deterministic nodes**, **12 tools**, and **2 independent locks** on the pull request: the graph topology, and a hook that re-checks the database verdict at the moment of the call.

### The gate: two blades, because one is not enough

**Blade 1: does it hold?** The test is rerun N times (default 200) with the polluting test pinned at method level, under rotating Surefire orders (alphabetical, reverse alphabetical, random, filesystem). Every run must pass. The harness reads the Surefire XML, never the Maven exit code, deletes stale reports before each run, and **counts a skipped test as a failure**.

**Blade 2: is it a real fix or a mask?** A deterministic scanner checks the diff against 8 band-aid families: sleep, retry, ignore, timeout, order pinning, fork isolation, weakened assertions and swallowed failures. A band-aid judge agent (structured output) gives a second opinion and can add a refusal. **It cannot overrule a scanner hit**, and it reads only the diff, the test and its reproduction scope, **never the agents' diagnosis**, so it stays an independent reviewer.

**Verdicts:** `VERIFIED` (Blade 2 clean and every rerun passed), `REFUSED_BANDAID`, or `REFUSED_UNPROVEN`.

**What "verified" means:** 0 failures in N runs bounds the true failure rate below 3/N at 95% confidence (the rule of three): below 1.5% at 200 runs. That is proof to a stated confidence, not proof of impossibility, and every pull request body says so.

### Strands Agents features used

| Strands feature | How Flakeproof uses it | File |
|---|---|---|
| `Graph` (`GraphBuilder`) | 7-node pipeline with a conditional edge out of the gate | [`agent/pipeline.py`](agent/pipeline.py) |
| `Swarm` | 4 diagnosis agents with handoffs, handoff limits and timeouts | [`agent/swarm.py`](agent/swarm.py) |
| Custom `MultiAgentBase` nodes | The proof engine runs as deterministic nodes inside the same graph, so agents cannot route around it | [`agent/nodes.py`](agent/nodes.py) |
| `@tool`, `ToolContext` | 12 tools: source reading and search, real JVM experiments (`run_pair`, `run_victim_alone`), editing, compile checks, candidate snapshots, the pull request | [`agent/tools.py`](agent/tools.py) |
| Hooks (`HookProvider`) | `TraceHooks` log every tool call and handoff to SQLite; `RefusalGuard` cancels `open_pull_request` unless the verdict is VERIFIED | [`agent/hooks.py`](agent/hooks.py) |
| Structured output | The band-aid judge returns a typed opinion: is it a band-aid, category, confidence, offending line | [`agent/gate.py`](agent/gate.py) |
| `BedrockModel` | Every agent runs on Amazon Nova 2 Lite (`us.amazon.nova-2-lite-v1:0`) | [`agent/models.py`](agent/models.py) |

---

## The demo: one real flaky test, three candidates, three verdicts

**The test.** [marine-api](https://github.com/ktuukkan/marine-api), an open-source Java library for marine navigation data. `SentenceFactory` is a singleton holding a map from sentence type to parser. `SentenceFactoryTest#testRegisterParserWithAlternativeBeginChar` registers a test-double `VDMParser` over the real one, then unregisters it, which deletes the `"VDM"` entry entirely. The class resets the factory **before** each test but never **after**, so later test classes in the same JVM that parse an AIS `VDM` sentence fail with `Parser for type 'VDM' not found`. The maintainers fixed it in [PR #109](https://github.com/ktuukkan/marine-api/pull/109) with an `@After` reset. Flakeproof works on the commit just before that fix.

**The planted candidates** (hand-written and labelled `planted`, in [`demo/candidates/`](demo/candidates)):

1. **Restore the VDM parser at the end of the test.** Looks right, but `VDMParser` in that file is the test double, so it restores the wrong class.
2. **`@Ignore` the polluting test.** Nothing dirties the singleton any more, so every rerun passes.
3. **The maintainers' own `@After` reset**, exactly as merged upstream.

### Measured results (September 13, 2026, from `data/runs.db`)

**Run 1: the gate on the planted candidates, 30 reruns each.** Baseline before any patch: 14 of 20 runs passed.

| Candidate | Blade 1 | Blade 2 | Verdict |
|---|---|---|---|
| Restore the VDM parser (wrong class) | 17 / 30 | CLEAN (model: 95% real fix) | **REFUSED_UNPROVEN** |
| `@Ignore` the polluting test | **30 / 30** | BANDAID: `ignore`, line 220 | **REFUSED_BANDAID** |
| `@After` reset (upstream fix) | 30 / 30 | CLEAN | **VERIFIED** |

The wrong-class patch failed every reverse-alphabetical run, the order where the polluter runs first. Wall clock: 7 min 24 s.

**Run 2: the first full agent run, 5 reruns per candidate** (a smoke test of the agent path, not statistical evidence). Baseline: 3 of 4.

| Candidate | Written by | Blade 1 | Blade 2 | Verdict |
|---|---|---|---|---|
| Validate AIS fragment order in `AISMessageParser` | **repair agent** | 4 / 5 | CLEAN (model: 95% real fix) | **REFUSED_UNPROVEN** |
| Restore the VDM parser (wrong class) | planted | 3 / 5 | BANDAID (model: 90%) | REFUSED_BANDAID |
| `@Ignore` the polluting test | planted | 5 / 5 | BANDAID: `ignore`, line 220 | REFUSED_BANDAID |
| `@After` reset (upstream fix) | planted | 5 / 5 | CLEAN | **VERIFIED** |

What the agents did: the **triage agent**'s first experiment paired the right class, `SentenceFactoryTest`, but a whole-class pairing passes, because the class resets state before each test and only its last method leaves it dirty. Triage dropped the right suspect, ran 87 more pairings, and hit its 7-minute limit without handing off. The **synthesizer** got the category right and the root cause wrong (AIS fragment ordering). The **repair agent** patched production code to match. **The gate refused it.** Wall clock: 12 min 39 s.

**Run 3: the refusal path, 5 reruns** (only the two planted patches that must be refused). Baseline: 2 of 4. The wrong-class restore was REFUSED_UNPROVEN at 3 / 5 and the `@Ignore` REFUSED_BANDAID at 5 / 5, so no candidate was verified: the `refuse` node printed the refusal statement and no pull request was opened. Wall clock: 1 min 30 s.

**Run 4: the agents after the fix, 5 reruns, no planted candidates.** Baseline: 2 of 4.

| Candidate | Written by | Blade 1 | Blade 2 | Verdict |
|---|---|---|---|---|
| Reset `SentenceFactory` at the end of the polluting test | **repair agent** | 5 / 5 | CLEAN (model: 95% real fix) | **VERIFIED** |

What the agents did: triage read the failure and the source, then made **one** `run_pair` call on `SentenceFactoryTest`. The class as a whole passed, so the tool pinned its methods one at a time, and the 14th, `testRegisterParserWithAlternativeBeginChar`, broke the victim. Triage recorded that hypothesis at 0.9 confidence. The **synthesizer** named the right root cause and polluter, and the **repair agent** added `instance.reset()` at the end of the polluting test. The gate verified it and the PR writer produced the pull request body (dry run). Wall clock: 2 min 34 s.

Across all four runs: 157 JVM executions, 3.6 s each on average.

### What we changed between run 2 and run 4, and why

1. **`run_pair` pins methods when a class passes.** A class that resets shared state before each test hides its polluting method at class level. The tool now pins each method in turn when the whole class does not break the victim.
2. **A budget of 12 pairings per attempt**, shared by the whole team, so no agent can brute-force the suite again.
3. **Generic examples in tool descriptions.** In run 2 the tool descriptions the agents read still used this target's class and method names as examples. They were replaced with made-up names before run 4, so run 4's diagnosis did not come from the prompt.
4. **The band-aid judge no longer reads the agents' diagnosis.** In run 1 the model rated the wrong-class patch "95% real fix". In run 2, after reading the agents' wrong diagnosis, it called the same patch a "90% band-aid". The scanner gave the same answer both times. **A model's opinion is not a safety mechanism. The rerun harness and the deterministic scanner are.**

---

## What is verified, and what is not

| Capability | Status on September 13, 2026 |
|---|---|
| Rerun harness, band-aid scanner, per-candidate verdicts | **Verified**: 157 JVM runs recorded |
| Three planted candidates, three different verdicts | **Verified** at 30 reruns (run 1) |
| Gate refuses an agent-written wrong fix | **Verified** (run 2) |
| `refuse` node when no candidate is verified | **Verified** (run 3) |
| Agents find the polluter and write a fix the gate verifies | **Verified** once, at 5 reruns (run 4) |
| Strands graph on Amazon Nova 2 Lite, verified path (intake to open_pr) | **Verified** in runs 2 and 4 |
| Swarm handoffs between specialists | Not yet observed: in run 4 triage confirmed the cause itself |
| Pull request opened on GitHub | Implemented, fork and token set up; run so far as a dry run only |
| 200-rerun demo run | Not yet recorded |
| Amazon Bedrock AgentCore deployment of the gate | Code path exists, not deployed |
| Web UI (`frontend/`): landing page and dashboard | **Verified** in a browser on real data: served by `dashboard/app.py`, polling `/api/replay` |

---

## Run it

**Requirements:** Python 3.12, Git, JDK 11 and Maven 3.9 (the target fails to build on JDK 25), and access to Amazon Nova 2 Lite on Amazon Bedrock in `us-east-1`. Without model access, set `FLAKEPROOF_PROVIDER=none`: the harness, scanner, gate and planted candidates still run.

```bash
git clone https://github.com/sidharthnair7/FlakeProof.git
cd FlakeProof
python -m venv .venv
```

Activate the virtual environment (`.venv\Scripts\activate` on Windows, `source .venv/bin/activate` elsewhere), then:

```bash
pip install -r requirements.txt
cp .env.example .env
```

Fill in `.env`: a Bedrock API key or AWS credentials, plus `FLAKEPROOF_JAVA_HOME` and `FLAKEPROOF_MVN` for your machine.

```bash
python -m agent initdb
python -m agent prepare --target marine-api
```

`prepare` clones marine-api, checks out the parent of the upstream fix commit and builds it once, so every rerun afterwards is offline.

**Judge one patch with Blade 2 only** (no JVM, a few seconds; exit code 0 clean, 2 band-aid):

```bash
python -m agent gate demo/candidates/02-ignore-polluter.diff
```

**The gate on the planted candidates** (no agents):

```bash
python -m agent run --target marine-api --no-agent --plant "demo/candidates/*.diff" --reruns 30 --no-pr
```

**The full agent pipeline** (drop `--no-pr` and set `GITHUB_TOKEN` to open a real pull request on your fork):

```bash
python -m agent run --target marine-api --reruns 200 --no-pr
```

Add `--plant "demo/candidates/*.diff"` to judge the planted candidates alongside the agents' own.

**See what was recorded, export it, run the tests:**

```bash
python -m agent status
python -m agent export --out replay.json
python -m unittest discover -s tests -t .
```

**Open the web UI** (landing page and dashboard, reading the same `runs.db`; needs Node.js, tested with Node 25 and npm 11). Build it once:

```bash
cd frontend
npm ci
npm run build
cd ..
```

Then start the app and open http://localhost:8000:

```bash
python -m uvicorn dashboard.app:app --port 8000
```

The dashboard polls `/api/replay` every 3 seconds, so a run in progress fills in live. For UI development, `npm run dev` in `frontend/` serves on http://localhost:5173 and proxies `/api` to the app.

**If a pull request fails to open** (network, token, permissions), the verdicts are still recorded. Retry just the pull request, with no reruns:

```bash
python -m agent pr --attempt 5
```

Other commands: `verify` reruns any test N times, `findpolluter` sweeps every test class to find which one breaks a victim, and `pr --attempt N --dry-run` writes the pull request body without calling GitHub.

**Planting your own candidate:** a `.diff` file whose first lines are `# title:` and `# rationale:`. Create it with `git diff --output=file.diff`, not shell redirection: Windows PowerShell's `>` writes UTF-16.

---

## Repository layout

```
agent/
  __main__.py   CLI: initdb, status, prepare, run, gate, verify, findpolluter, export
  pipeline.py   the Strands Graph and its conditional edges
  swarm.py      the 4-agent diagnosis Swarm
  nodes.py      deterministic graph nodes: intake, gate, refuse
  tools.py      the 12 Strands tools, including the pairing budget and method sweep
  hooks.py      TraceHooks and RefusalGuard
  gate.py       Blade 2: scanner plus structured-output model opinion
  bandaid.py    the deterministic band-aid scanner
  harness.py    Blade 1: rerun harness and Surefire XML parser
  repo.py       git apply, tree reset, Maven compile
  github.py     branch, commit and pull request through the GitHub REST API
  polluter.py   polluter sweep used to build reproduction recipes
  targets.py    verified reproductions (marine-api PR #109)
  db.py         SQLite schema, writers and readers
  models.py     model provider: Bedrock, Anthropic or none
  schemas.py    structured output schemas
  session.py    run context shared by tools, nodes and hooks
  config.py     settings from the environment and .env
demo/candidates/  the three planted patches
docs/             architecture diagram (SVG and PNG)
tests/            unit tests: scanner, Surefire parser, patch loading, judge independence
dashboard/        FastAPI app: /api/replay and the built web UI from one address
frontend/         React web UI (landing page and dashboard) on real data from runs.db
```

---

## How the reproduction was built

Targets come from [IDoFT](https://github.com/TestingResearchIllinois/idoft), the International Dataset of Flaky Tests, which records each flaky test with its category and its fix pull request, so ground truth is free. Two lessons are encoded in [`agent/targets.py`](agent/targets.py):

1. **IDoFT's "SHA Detected" is not reliably where the flake lives.** Flakeproof checks out the fix commit's parent, the last state where the bug provably existed.
2. **Class-level ordering is not always enough.** The polluting class resets state before each test, so only the last method to run leaves it dirty. The polluter is pinned at method level. Run 2 showed an agent falling into exactly this trap, which is why `run_pair` now pins methods itself.

The marine-api reproduction was verified by hand first: all 12 victims pass in isolation and all 12 fail when the polluting method runs first, matching the 12 tests IDoFT lists for PR #109. A second candidate, ormlite-core PR #310, was investigated and rejected: 131 of 131 candidate polluter classes swept, plus a full 1,440-test run, with zero failures.

---

## Prior work, and what is different here

Automated repair of order-dependent tests is not new. [iFixFlakies](https://doi.org/10.1145/3338906.3338925) (ESEC/FSE 2019) fixes them by reusing "helper" tests already in the suite whose logic resets or sets the shared state, and [FlakyGuard](https://arxiv.org/abs/2511.14002) repairs flaky tests at industry scale. Flakeproof does not claim to generate better patches. Its contribution is the **refusal**: an explicit, deterministic rule for which patches must not be proposed even when they pass, with the evidence written into the pull request so a reviewer can check it instead of trusting it.

---

## Limitations and next steps

- **Order-dependent flaky tests only.** Async-wait flakes need a different Blade 1, because controlling test order does not make them reproduce.
- **Blade 1 cannot rank two real fixes.** The agents' inline `reset()` in run 4 and the maintainers' `@After` both pass every rerun. The inline version would not run if an earlier assertion in that test failed, so the `@After` is sturdier. A reviewer still has to prefer it.
- **The agent path has been measured at 5 reruns only.** Next: the 200-rerun run.
- **No swarm handoff observed yet.** In run 4 triage confirmed the cause itself. Next: a target where the first specialist is the wrong one.
- **One target so far.** Next: more IDoFT order-dependent tests with verified reproductions.
- **Next:** a real pull request on the fork, and deploying the gate on Amazon Bedrock AgentCore.

---

## License

[MIT](LICENSE) © 2026 Sidharth Nair
