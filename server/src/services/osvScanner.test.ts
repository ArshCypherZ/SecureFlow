import assert from "node:assert/strict";
import test from "node:test";
import { parseOsvScannerOutput } from "./osvScanner.js";

test("parseOsvScannerOutput maps osv-scanner JSON results into tickets", () => {
  const findings = parseOsvScannerOutput(
    JSON.stringify({
      results: [
        {
          source: {
            path: "/tmp/requirements.txt",
            type: "lockfile",
          },
          packages: [
            {
              package: {
                name: "django",
                version: "4.2.0",
                ecosystem: "PyPI",
              },
              vulnerabilities: [
                {
                  id: "GHSA-test-1234",
                  summary: "Example advisory",
                  details: "Detailed advisory text",
                  severity: [{ type: "CVSS_V3", score: "9.8" }],
                  affected: [
                    {
                      package: { name: "django", ecosystem: "PyPI" },
                      ranges: [{ events: [{ introduced: "0" }, { fixed: "4.2.1" }] }],
                    },
                  ],
                  references: [{ url: "https://example.com/advisory" }],
                },
              ],
            },
          ],
        },
      ],
    })
  );

  assert.equal(findings.length, 1);
  assert.equal(findings[0]?.osvId, "GHSA-test-1234");
  assert.equal(findings[0]?.package, "django");
  assert.equal(findings[0]?.ecosystem, "PyPI");
  assert.equal(findings[0]?.currentVersion, "4.2.0");
  assert.equal(findings[0]?.fixedVersion, "4.2.1");
  assert.equal(findings[0]?.severity, "CRITICAL");
});

test("parseOsvScannerOutput ignores incomplete package rows and handles empty output", () => {
  assert.deepEqual(parseOsvScannerOutput(""), []);
  assert.deepEqual(
    parseOsvScannerOutput(
      JSON.stringify({
        results: [
          {
            packages: [
              {
                package: {
                  name: "missing-version",
                  ecosystem: "PyPI",
                },
                vulnerabilities: [{ id: "GHSA-ignored" }],
              },
            ],
          },
        ],
      })
    ),
    []
  );
});
