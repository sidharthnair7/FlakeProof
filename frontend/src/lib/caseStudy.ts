import type { GateVerdict, PipelineStage } from "./types";

export interface CaseStudyPatch {
  id: string;
  label: string;
  approach: string;
  diffSnippet: string;
  verdict: GateVerdict;
  blade1Runs: {
    passedRuns: number;
    totalRuns: number;
    passRate: number;
    passed: boolean;
    failureDetail?: string;
  };
  blade2Scan: {
    passed: boolean;
    detectedBandAid?: "@Ignore" | "sleep" | "retry" | "pinned_order" | "weakened_assertion";
    offendingLine?: string;
    explanation: string;
  };
  prUrl?: string;
}

/**
 * A labelled, static rendering of recorded attempt #5. It exists so the landing
 * page explains one real case without pretending that an unavailable API is live.
 * The dashboard itself reads only GET /api/replay.
 */
export const MARINE_API_CASE_STUDY: {
  id: string;
  testTitle: string;
  repository: string;
  filePath: string;
  stage: PipelineStage;
  victimTest: string;
  polluterTest: string;
  flakinessRate: number;
  baselineRuns: number;
  detectedAt: string;
  sqliteAuditId: string;
  orderSequence: { failingOrder: string[]; passingOrder: string[] };
  rootCause: { description: string; singletonClass: string; leakExplanation: string };
  candidatePatches: CaseStudyPatch[];
} = {
  id: "recorded-attempt-5",
  testTitle: "AISMessageFactoryTest#testCreate",
  repository: "ktuukkan/marine-api",
  filePath: "src/test/java/net/sf/marineapi/nmea/parser/SentenceFactoryTest.java",
  stage: "verdict",
  victimTest: "AISMessageFactoryTest#testCreate",
  polluterTest: "SentenceFactoryTest#testRegisterParserWithAlternativeBeginChar",
  flakinessRate: 35,
  baselineRuns: 20,
  detectedAt: "Recorded attempt #5",
  sqliteAuditId: "runs.db · attempt #5",
  orderSequence: {
    failingOrder: [
      "SentenceFactoryTest#testRegisterParserWithAlternativeBeginChar",
      "AISMessageFactoryTest#testCreate",
    ],
    passingOrder: [
      "AISMessageFactoryTest#testCreate",
      "SentenceFactoryTest#testRegisterParserWithAlternativeBeginChar",
    ],
  },
  rootCause: {
    description:
      "A SentenceFactory test unregisters the VDM parser. The singleton is reset before each test but not after the final test, so later AIS tests can inherit missing parser state.",
    singletonClass: "net.sf.marineapi.nmea.parser.SentenceFactory",
    leakExplanation:
      "The shared factory persists across test classes in one JVM. Resetting it in an @After method restores isolation.",
  },
  candidatePatches: [
    {
      id: "candidate-11",
      label: "Candidate 1: Restore the VDM parser",
      approach: "Re-registers VDM after the custom-parser test, but misses the full factory reset required for all execution orders.",
      verdict: "REFUSED_UNPROVEN",
      blade1Runs: {
        passedRuns: 121,
        totalRuns: 200,
        passRate: 60.5,
        passed: false,
        failureDetail: "Failed all 50 reverse-alphabetical reruns and 29 of 50 random reruns.",
      },
      blade2Scan: {
        passed: true,
        explanation: "The deterministic diff scan found no band-aid pattern, but reruns did not prove the patch.",
      },
      diffSnippet: [
        "+++ b/src/test/java/net/sf/marineapi/nmea/parser/SentenceFactoryTest.java",
        "@@",
        " instance.unregisterParser(VDMParser.class);",
        "+instance.registerParser(\"VDM\", VDMParser.class);",
      ].join("\n"),
    },
    {
      id: "candidate-12",
      label: "Candidate 2: Quarantine the polluting test",
      approach: "Adds @Ignore so the suite turns green by removing the signal instead of repairing shared state.",
      verdict: "REFUSED_BANDAID",
      blade1Runs: {
        passedRuns: 200,
        totalRuns: 200,
        passRate: 100,
        passed: true,
      },
      blade2Scan: {
        passed: false,
        detectedBandAid: "@Ignore",
        offendingLine: "@Ignore(\"Leaves SentenceFactory without a VDM parser and breaks the AIS tests. Quarantined.\")",
        explanation: "The deterministic diff scan refused an ignored test at line 220.",
      },
      diffSnippet: [
        "+++ b/src/test/java/net/sf/marineapi/nmea/parser/SentenceFactoryTest.java",
        "@@",
        "+@Ignore(\"Leaves SentenceFactory without a VDM parser and breaks the AIS tests. Quarantined.\")",
        " @Test",
      ].join("\n"),
    },
    {
      id: "candidate-13",
      label: "Candidate 3: Reset SentenceFactory after every test",
      approach: "Adds an @After reset, matching the upstream maintainer fix for the leaked singleton state.",
      verdict: "VERIFIED",
      blade1Runs: {
        passedRuns: 200,
        totalRuns: 200,
        passRate: 100,
        passed: true,
      },
      blade2Scan: {
        passed: true,
        explanation: "The deterministic diff scan was clean; all 200 controlled reruns passed.",
      },
      prUrl: "https://github.com/sidharthnair7/marine-api/pull/1",
      diffSnippet: [
        "+++ b/src/test/java/net/sf/marineapi/nmea/parser/SentenceFactoryTest.java",
        "@@",
        "+@After",
        "+public void tearDown() throws Exception {",
        "+  instance.reset();",
        "+}",
      ].join("\n"),
    },
  ],
};
