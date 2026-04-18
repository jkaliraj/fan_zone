import httpx, json

KEY = "a45149e9-5af6-455c-9ba8-a0fca7a0cf38"
BASE = "https://api.cricapi.com/v1"

r = httpx.get(f"{BASE}/currentMatches", params={"apikey": KEY}, timeout=15)
data = r.json()
if data.get("data"):
    # Find the RCB vs DC match
    for m in data["data"]:
        if "Royal Challengers" in m.get("name", "") or "Delhi Capitals" in m.get("name", ""):
            print(json.dumps(m, indent=2, default=str))
            break
    else:
        # Print first IPL match
        for m in data["data"]:
            if "Indian Premier League" in m.get("name", ""):
                print(json.dumps(m, indent=2, default=str))
                break
