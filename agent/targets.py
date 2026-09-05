"""Known-good reproductions. Verified by hand before being trusted by anything else.

Lesson from ormlite-core: IDoFT's "SHA Detected" is NOT reliably where the flake lives.
For ormlite-core the detection SHA (Dec 2021, JUnit 4) and the fix (Feb 2025, JUnit 5) are
three years and a framework migration apart, and the flake does not reproduce at either.
Use the fix commit's PARENT instead, which is by definition the last state where the bug
was still present.

Second lesson: class-level ordering is not always enough. marine-api's polluter class has a
@Before that resets the singleton, so only the LAST method to run leaves it dirty. The
polluter must be pinned at METHOD granularity.
"""
from dataclasses import dataclass, field


@dataclass(frozen=True)
class Target:
    repo_url: str
    fix_commit: str          # upstream fix; we check out fix_commit^
    polluter: str            # Surefire selector, may be Class#method
    victim_classes: list[str]
    victim_methods: list[str] = field(default_factory=list)
    run_order: str = "reversealphabetical"
    note: str = ""


MARINE_API = Target(
    repo_url="https://github.com/ktuukkan/marine-api",
    fix_commit="b5b80bc2e8868e2cf0358e487e177668a8654a65",
    polluter="SentenceFactoryTest#testRegisterParserWithAlternativeBeginChar",
    victim_classes=[
        "net.sf.marineapi.ais.parser.AISMessageFactoryTest",
        "net.sf.marineapi.ais.event.AbstractAISMessageListenerTest",
    ],
    victim_methods=[
        "testCreate", "testCreateWithTwo", "testCreateWithIncorrectOrder",
        "testConstructor", "testParametrizedConstructor", "testGenericsListener",
        "testGenericsListenerDefaultConstructorThrows", "testOnMessageWithExpectedMessage",
        "testBasicListenerWithUnexpectedMessage", "testSequenceListener",
        "testSequenceListenerWithIncorrectOrder", "testSequenceListenerWithMixedOrder",
    ],
    note=(
        "VERIFIED 2026-09-05. 12/12 pass alone; 12/12 fail when the polluter method runs "
        "first. Root cause: SentenceFactoryTest registers a custom VDMParser into the "
        "SentenceFactory singleton and (pre-fix) has no @After reset, so AIS tests get the "
        "wrong parser for VDM sentences. Upstream fix adds @After { instance.reset(); }. "
        "Matches all 12 IDoFT rows for PR #109 exactly."
    ),
)

# Investigated and REJECTED: ormlite-core PR #310. Does not reproduce - 131/131 classes
# swept as polluter candidates, plus a full 1440-test suite run with the logger package
# forced first: zero failures. Both sweep and harness were control-validated first.
