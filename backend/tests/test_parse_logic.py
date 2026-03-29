import osv_client
import json

raw_osv_data = {
    "id": "CVE-2023-1234",
    "summary": "a bad thing",
    "details": "very bad thing",
    "severity": [{"type": "CVSS_V3", "score": "CVSS:3.1/AV:N/AC:H/PR:N/UI:R/S:U/C:H/I:N/A:N"}],
    "affected": [
        {
            "package": {"name": "django", "ecosystem": "PyPI"},
            "ranges": [{"events": [{"introduced": "0"}, {"fixed": "4.2.1"}]}]
        }
    ],
    "references": [{"type": "WEB", "url": "http://example.com/advisory"}]
}

parsed = osv_client.parse_vuln(raw_osv_data, "django", "PyPI", "4.2.0")
print(json.dumps(parsed, indent=2))
