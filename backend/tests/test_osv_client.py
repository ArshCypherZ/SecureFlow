import unittest
from unittest.mock import patch
import osv_client

class TestOSVClient(unittest.TestCase):
    
    @patch('osv_client.requests.post')
    def test_query_vulns(self, mock_post):
        mock_post.return_value.json.return_value = {"vulns": []}
        
        response = osv_client.query_vulns("requests", "PyPI", "2.25.0")
        
        self.assertEqual(response, {"vulns": []})
        mock_post.assert_called_with(
            "https://api.osv.dev/v1/query", 
            json={"version": "2.25.0", "package": {"name": "requests", "ecosystem": "PyPI"}}
        )

    @patch('osv_client.requests.post')
    def test_batch_query(self, m_post):
        m_post.return_value.json.return_value = {"results": []}
        
        payload = [{"version": "1.0", "package": {"name": "left-pad", "ecosystem": "npm"}}]
        out = osv_client.batch_query(payload)
        
        self.assertIn("results", out)
        m_post.assert_called_once()
        
    @patch('osv_client.requests.get')
    def test_fetch_vuln(self, m_get):
        test_id = "GHSA-1234-5678"
        m_get.return_value.json.return_value = {"id": test_id, "summary": "test"}
        
        data = osv_client.fetch_vuln(test_id)
        self.assertEqual(data["id"], test_id)
        m_get.assert_called_with(f"https://api.osv.dev/v1/vulns/{test_id}")

    def test_parse_vuln_complete_data(self):
        raw_osv_data = {
            "id": "CVE-2023-1234",
            "summary": "a bad thing",
            "details": "very bad thing",
            "severity": [{"type": "CVSS_V3", "score": "9.8"}],
            "affected": [
                {
                    "package": {"name": "django", "ecosystem": "PyPI"},
                    "ranges": [{"events": [{"introduced": "0"}, {"fixed": "4.2.1"}]}]
                }
            ],
            "references": [{"type": "WEB", "url": "http://example.com/advisory"}]
        }
        
        parsed = osv_client.parse_vuln(raw_osv_data, "django", "PyPI", "4.2.0")
        
        self.assertEqual(parsed["osvId"], "CVE-2023-1234")
        self.assertEqual(parsed["summary"], "a bad thing")
        self.assertEqual(parsed["description"], "very bad thing")
        self.assertEqual(parsed["cvssScore"], "9.8")
        self.assertEqual(parsed["fixedVersion"], "4.2.1")
        self.assertEqual(parsed["references"], ["http://example.com/advisory"])

    def test_parse_vuln_missing_optional_fields(self):
        bare_data = {
            "id": "GHSA-minimal"
        }
        
        parsed = osv_client.parse_vuln(bare_data, "flask", "PyPI", "1.0")
        
        self.assertEqual(parsed["osvId"], "GHSA-minimal")
        self.assertEqual(parsed["cvssScore"], "0.0")
        self.assertIsNone(parsed["fixedVersion"])
        self.assertEqual(parsed["references"], [])

if __name__ == '__main__':
    unittest.main()
