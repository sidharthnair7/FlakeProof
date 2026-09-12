"""Pydantic shapes the model must fill in. Structured output means no regex over prose."""
from typing import Literal

from pydantic import BaseModel, Field

Category = Literal[
    "order-dependent", "async-wait", "concurrency", "unordered-collection", "time",
    "resource-leak", "other",
]

CATEGORY_HELP = {
    "order-dependent": "passes alone, fails after another test leaves shared state dirty (statics, singletons, files, env)",
    "async-wait": "asserts before an asynchronous operation has completed",
    "concurrency": "races between threads inside the test or the code under test",
    "unordered-collection": "assumes iteration order of a HashMap/HashSet or similar",
    "time": "depends on wall-clock time, timezone, locale or date boundaries",
    "resource-leak": "ports, files, sockets or connections left open by an earlier test",
    "other": "none of the above",
}


class BandAidOpinion(BaseModel):
    """The model's independent reading of a patch. The deterministic scanner is the other reader."""
    is_bandaid: bool = Field(description="True if the patch masks the flake instead of fixing its cause")
    category: str = Field(description="sleep | retry | ignore | timeout | order_pinning | isolation | "
                                      "assertion_weakening | swallow | none")
    confidence: float = Field(ge=0, le=1, description="0..1 confidence in is_bandaid")
    offending_line: str = Field(default="", description="The single most damning added line, verbatim, or empty")
    reasoning: str = Field(description="Two to four sentences a maintainer would accept")


class Diagnosis(BaseModel):
    category: Category
    root_cause: str = Field(description="Two to four sentences naming the shared state or race and who dirties it")
    polluter: str = Field(default="", description="For order-dependent: Surefire selector Class#method of the polluting test, else empty")
    mechanism: str = Field(description="The exact chain: what runs first, what it leaves behind, what the victim reads")
    fix_strategy: str = Field(description="Where the real fix belongs (polluter cleanup, victim setup, production code) and why")
    confidence: float = Field(ge=0, le=1)
