import requests

url_base='https://api.osv.dev/v1'

def query_vulns(pkg, eco, ver):
    req_body = {"version": ver, "package": {"name": pkg, "ecosystem": eco}}
    res = requests.post(f"{url_base}/query", json=req_body)
    res.raise_for_status()
    return res.json()


def batch_query(queries_list):
    resp = requests.post(
        url_base + "/querybatch",
        json={"queries": queries_list}
    )
    resp.raise_for_status()
    return resp.json()

def fetch_vuln(osv_id):
    r = requests.get(url_base+"/vulns/"+osv_id)
    r.raise_for_status()
    return r.json()

def parse_vuln(data, pkg, eco, ver):
    score = "0.0"
    if "severity" in data:
        for s in data["severity"]:
            if s["type"] in ("CVSS_V3", "CVSS_V4"):
                score = s["score"]
                break
                
    fixed_ver = None
    for affected in data.get("affected", []):
        if affected["package"]["name"] == pkg:
            if "ranges" in affected:
                for rng in affected["ranges"]:
                    for ev in rng.get("events", []):
                        if "fixed" in ev:
                            fixed_ver = ev["fixed"]
                            break
            if fixed_ver: break
                
    refs = [ref["url"] for ref in data.get("references", [])]
    
    return {
        "osvId": data["id"],
        "summary": data.get("summary", ""),
        "description": data.get("details", ""),
        "severity": "UNKNOWN", 
        "cvssScore": score,
        "package": pkg,
        "ecosystem": eco,
        "currentVersion": ver,
        "fixedVersion": fixed_ver,
        "references": refs
    }
