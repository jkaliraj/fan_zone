import httpx, json

KEY = "a45149e9-5af6-455c-9ba8-a0fca7a0cf38"
BASE = "https://api.cricapi.com/v1"

print("=== currentMatches ===")
r = httpx.get(f"{BASE}/currentMatches", params={"apikey": KEY}, timeout=15)
data = r.json()
print("Status:", data.get("status"))
print("Info:", data.get("info"))
if data.get("data"):
    for m in data["data"][:5]:
        name = m.get("name", "?")
        series = m.get("series", "?")
        teams = m.get("teams", [])
        t1 = m.get("t1", "")
        t2 = m.get("t2", "")
        started = m.get("matchStarted")
        ended = m.get("matchEnded")
        print(f"  {name} | series={series} | teams={teams} | t1={t1} | t2={t2} | started={started} ended={ended}")
else:
    print("  NO DATA")

print()
print("=== cricScore ===")
r2 = httpx.get(f"{BASE}/cricScore", params={"apikey": KEY}, timeout=15)
data2 = r2.json()
print("Status:", data2.get("status"))
print("Info:", data2.get("info"))
if data2.get("data"):
    for s in data2["data"][:5]:
        t1 = s.get("t1", "?")
        t2 = s.get("t2", "?")
        series = s.get("series", "?")
        ms = s.get("ms", "?")
        status = s.get("status", "?")
        print(f"  {t1} vs {t2} | series={series} | ms={ms} | status={status}")
else:
    print("  NO DATA")

print()
print("=== matches (all) ===")
r3 = httpx.get(f"{BASE}/matches", params={"apikey": KEY}, timeout=15)
data3 = r3.json()
print("Status:", data3.get("status"))
print("Info:", data3.get("info"))
if data3.get("data"):
    for m in data3["data"][:8]:
        name = m.get("name", "?")
        series = m.get("series", "?")
        teams = m.get("teams", [])
        started = m.get("matchStarted")
        ended = m.get("matchEnded")
        print(f"  {name} | series={series} | teams={teams} | started={started} ended={ended}")
else:
    print("  NO DATA")
