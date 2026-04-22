import assert from "node:assert/strict";
import test from "node:test";
import { parseVuln } from "./osvClient.js";

test("parseVuln maps complete OSV records into scan tickets", () => {
  const parsed = parseVuln(
    {
      id: "CVE-2023-1234",
      summary: "a bad thing",
      details: "very bad thing",
      severity: [{ type: "CVSS_V3", score: "9.8" }],
      affected: [
        {
          package: { name: "django", ecosystem: "PyPI" },
          ranges: [{ events: [{ introduced: "0" }, { fixed: "4.2.1" }] }],
        },
      ],
      references: [{ url: "http://example.com/advisory" }],
    },
    "django",
    "PyPI",
    "4.2.0"
  );

  assert.equal(parsed.source, "scan");
  assert.equal(parsed.osvId, "CVE-2023-1234");
  assert.equal(parsed.summary, "a bad thing");
  assert.equal(parsed.description, "very bad thing");
  assert.equal(parsed.cvssScore, 9.8);
  assert.equal(parsed.severity, "CRITICAL");
  assert.equal(parsed.fixedVersion, "4.2.1");
  assert.deepEqual(parsed.references, ["http://example.com/advisory"]);
});

test("parseVuln handles vector scores and missing optional fields", () => {
  const parsed = parseVuln(
    {
      id: "GHSA-minimal",
      severity: [
        {
          type: "CVSS_V3",
          score: "CVSS:3.1/AV:N/AC:H/PR:N/UI:R/S:U/C:H/I:N/A:N/5.6",
        },
      ],
    },
    "flask",
    "PyPI",
    "1.0"
  );

  assert.equal(parsed.osvId, "GHSA-minimal");
  assert.equal(parsed.cvssScore, 5.6);
  assert.equal(parsed.severity, "MEDIUM");
  assert.equal(parsed.fixedVersion, null);
  assert.deepEqual(parsed.references, []);
});
