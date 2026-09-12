"""The diagnosis swarm: a triage agent and three specialists who hand the case to each other.

Why a Swarm and not a fan-out: a flaky test has one root cause, and the interesting part of
diagnosis is changing your mind. A handoff is a recorded change of hypothesis with the evidence
that forced it. The trace of who handed to whom, and why, is shown on the dashboard.

Every specialist has the same read-only tools plus two experiments (run the victim alone, run it
after a suspect). They can spend a 7-second JVM run to confirm a hypothesis, and they must record
what they concluded before they finish.
"""
from strands import Agent
from strands.multiagent import Swarm

from agent.schemas import CATEGORY_HELP
from agent.tools import (failure_report, list_test_classes, read_source, record_hypothesis,
                         run_pair, run_victim_alone, search_code)

CATEGORY_TEXT = "\n".join(f"  - {k}: {v}" for k, v in CATEGORY_HELP.items())

COMMON_RULES = f"""
You are part of a small team diagnosing ONE flaky Java test. Diagnosis only: never propose or
write code changes; a separate agent repairs, and a deterministic gate judges the repair.

Rules
- Call failure_report first if you have not read it.
- Evidence before conclusions. Every hypothesis you record must cite a tool result or a source
  line. run_pair and run_victim_alone are real JVM runs (about 7 seconds each); use them to
  confirm, not to explore. Form a hypothesis from the stack trace and the source first.
- If the evidence points to a category that belongs to another specialist, hand off to them with
  handoff_to_agent and say exactly what you found. Do not hand off just to be polite.
- Before you finish or hand off, call record_hypothesis with your category, confidence, a
  summary, and the evidence.
- When you are confident (0.8 or higher) and have recorded your hypothesis, finish with a plain
  summary that starts with the line DIAGNOSIS SUMMARY: and that names the category, the
  mechanism, and (for order-dependent tests) the polluting test as Class#method.

Root-cause categories
{CATEGORY_TEXT}
"""

TRIAGE_PROMPT = COMMON_RULES + """
Your role: triage. Read the failure report and the victim's source, form a first hypothesis about
the category, and hand off to the specialist for that category with what you found. If the
category is obvious and you can confirm it in at most two experiments, you may finish the
diagnosis yourself.
"""

ORDER_PROMPT = COMMON_RULES + """
Your role: order-dependence specialist. You know that a test which passes alone and fails after
another test is reading state that the earlier test left dirty: static fields, singletons,
registries, system properties, files, environment. Your method: look at what the failing frame
touches (the exception message and the stack trace name the shared object), search the tests
for code that mutates that object (register, unregister, set, clear, reset, put, remove), read
the suspect test methods, then confirm with run_pair using Class#method for the exact method
whose cleanup is missing. A class-level pairing is not enough when the class has a @Before
reset: only the LAST method to run leaves state dirty, so pin the method.
"""

ASYNC_PROMPT = COMMON_RULES + """
Your role: async-wait and concurrency specialist. You look for assertions that run before an
asynchronous operation completes, unsynchronised shared structures, executor services, callbacks,
latches, timers and thread starts in the victim and the code it calls. Prove the timing
dependence from the code; the harness varies order, not machine speed, so an order-dependent
failure that reproduces deterministically under a fixed order is NOT yours: hand it to the
order-dependence specialist.
"""

RESOURCE_PROMPT = COMMON_RULES + """
Your role: resource, collection and time specialist. Ports, files, sockets and connections that
an earlier test leaves open; HashMap or HashSet iteration order assumed to be stable; wall-clock
time, timezone, locale and date boundaries. Check the exception type against these: a
BindException or FileAlreadyExists points at a leak, a wrong-element assertion at iteration
order, a date mismatch at time. Anything else is likely another specialist's.
"""

TOOLS = [failure_report, read_source, search_code, list_test_classes, run_victim_alone,
         run_pair, record_hypothesis]


def build_diagnosis_swarm(model, hooks=None) -> Swarm:
    hooks = hooks or []
    make = lambda name, desc, prompt: Agent(  # noqa: E731
        name=name, description=desc, model=model, system_prompt=prompt, tools=TOOLS,
        hooks=list(hooks), callback_handler=None)
    triage = make("triage", "Reads the failure first and routes the case to a specialist", TRIAGE_PROMPT)
    order = make("order_specialist",
                 "Test-order dependence: shared statics, singletons, registries, missing cleanup",
                 ORDER_PROMPT)
    async_ = make("async_specialist",
                  "Async waits, races, executors, callbacks and other timing dependence", ASYNC_PROMPT)
    resource = make("resource_specialist",
                    "Leaked ports/files/connections, unordered collections, wall-clock time",
                    RESOURCE_PROMPT)
    return Swarm(
        [triage, order, async_, resource],
        entry_point=triage,
        max_handoffs=8,
        max_iterations=12,
        execution_timeout=1500.0,
        node_timeout=420.0,
        repetitive_handoff_detection_window=6,
        repetitive_handoff_min_unique_agents=2,
        hooks=list(hooks),
        id="diagnosis_swarm",
    )
