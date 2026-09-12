"""Known-good reproductions. Verified by hand before being trusted by anything else.

A target is a flaky test from IDoFT plus the reproduction recipe: the commit to check out and the
Surefire selector that, run in the same JVM, makes the victim fail. The recipe is what the
harness pins into every rerun. It is NOT handed to the diagnosis agents; they get the failure
and the code, and must find the mechanism themselves.

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
    name: str
    repo_url: str
    fix_commit: str          # upstream fix; we check out fix_commit^
    polluter: str            # Surefire selector, may be Class#method
    victim_classes: list[str]
    victim_methods: dict[str, list[str]] = field(default_factory=dict)   # fqcn -> methods
    idoft_pr: str = ""
    note: str = ""

    @property
    def dirname(self) -> str:
        return self.repo_url.rstrip("/").rsplit("/", 1)[-1]

    def victim(self, selector: str | None = None) -> tuple[str, str]:
        """Resolve `Class#method` (simple or fully qualified) or default to the first victim."""
        if not selector:
            fqcn = self.victim_classes[0]
            return fqcn, self.victim_methods[fqcn][0]
        cls, _, meth = selector.partition("#")
        for fqcn in self.victim_classes:
            if fqcn == cls or fqcn.rsplit(".", 1)[-1] == cls:
                methods = self.victim_methods.get(fqcn, [])
                if meth and meth not in methods:
                    raise SystemExit(f"{meth} is not a recorded victim method of {fqcn}: {methods}")
                return fqcn, meth or methods[0]
        raise SystemExit(f"{cls} is not a recorded victim class of {self.name}")


MARINE_API = Target(
    name="marine-api",
    repo_url="https://github.com/ktuukkan/marine-api",
    fix_commit="b5b80bc2e8868e2cf0358e487e177668a8654a65",
    polluter="SentenceFactoryTest#testRegisterParserWithAlternativeBeginChar",
    victim_classes=[
        "net.sf.marineapi.ais.parser.AISMessageFactoryTest",
        "net.sf.marineapi.ais.event.AbstractAISMessageListenerTest",
    ],
    victim_methods={
        "net.sf.marineapi.ais.parser.AISMessageFactoryTest": [
            "testCreate", "testCreateWithTwo", "testCreateWithIncorrectOrder"],
        "net.sf.marineapi.ais.event.AbstractAISMessageListenerTest": [
            "testConstructor", "testParametrizedConstructor", "testGenericsListener",
            "testGenericsListenerDefaultConstructorThrows", "testOnMessageWithExpectedMessage",
            "testBasicListenerWithUnexpectedMessage", "testSequenceListener",
            "testSequenceListenerWithIncorrectOrder", "testSequenceListenerWithMixedOrder"],
    },
    idoft_pr="https://github.com/ktuukkan/marine-api/pull/109",
    note=(
        "VERIFIED 2026-09-05. 12/12 victims pass alone; 12/12 fail when the polluter method runs "
        "first. Mechanism: testRegisterParserWithAlternativeBeginChar registers a test-only "
        "VDMParser into the SentenceFactory singleton and then unregisters it, which removes the "
        "VDM entry entirely; the class has a @Before reset but no @After, so if that method runs "
        "last, every later AIS test that parses an !AIVDM sentence gets 'Parser for type VDM not "
        "found'. Upstream fix adds @After { instance.reset(); }. Matches all 12 IDoFT rows."
    ),
)

TARGETS: dict[str, Target] = {MARINE_API.name: MARINE_API}

# Investigated and REJECTED: ormlite-core PR #310. Does not reproduce - 131/131 classes
# swept as polluter candidates, plus a full 1440-test suite run with the logger package
# forced first: zero failures. Both sweep and harness were control-validated first.
