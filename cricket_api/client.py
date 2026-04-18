"""CricAPI client — Real-time cricket data from CricketData.org API.

Uses the free CricAPI v1 endpoints:
  - /v1/currentMatches   → live/recent matches
  - /v1/matches          → all matches list
  - /v1/match_info       → detailed match info
  - /v1/series           → series list/search
  - /v1/series_info      → series details with all matches
  - /v1/cricScore        → live scores
  - /v1/players_info     → player details

Env var: CRICKET_API_KEY (get free key at https://cricketdata.org/signup.aspx)
"""

import os
import time
import httpx

BASE_URL = "https://api.cricapi.com/v1"

# ── Simple TTL Cache ──────────────────────────────────────────

_cache: dict = {}
_cache_ttl: dict = {}

CACHE_SHORT = 60       # 60s for live/current data
CACHE_MEDIUM = 300     # 5 min for match lists
CACHE_LONG = 3600      # 1 hour for series/player info


def _get_cached(key: str):
    if key in _cache and time.time() < _cache_ttl.get(key, 0):
        return _cache[key]
    return None


def _set_cache(key: str, value, ttl: int):
    _cache[key] = value
    _cache_ttl[key] = time.time() + ttl


# ── API Caller ────────────────────────────────────────────────

def _get_api_key() -> str:
    key = os.environ.get("CRICKET_API_KEY", "")
    if not key:
        raise ValueError(
            "CRICKET_API_KEY environment variable not set. "
            "Get a free key at https://cricketdata.org/signup.aspx"
        )
    return key


def _api_get(endpoint: str, params: dict = None, cache_ttl: int = CACHE_MEDIUM) -> dict:
    """Make a GET request to CricAPI with caching."""
    params = params or {}
    params["apikey"] = _get_api_key()

    cache_key = f"{endpoint}:{sorted(params.items())}"
    cached = _get_cached(cache_key)
    if cached is not None:
        return cached

    url = f"{BASE_URL}/{endpoint}"
    try:
        with httpx.Client(timeout=15.0) as client:
            resp = client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()

        if data.get("status") == "success":
            _set_cache(cache_key, data, cache_ttl)
            return data
        else:
            return {"status": "failure", "error": data.get("info", "API returned failure")}
    except httpx.TimeoutException:
        return {"status": "failure", "error": "API request timed out"}
    except httpx.HTTPStatusError as e:
        return {"status": "failure", "error": f"HTTP {e.response.status_code}"}
    except Exception as e:
        return {"status": "failure", "error": str(e)}


# ── Public API Functions ──────────────────────────────────────

def get_current_matches(offset: int = 0) -> dict:
    """Get currently running and recently completed matches."""
    return _api_get("currentMatches", {"offset": offset}, cache_ttl=CACHE_SHORT)


def get_all_matches(offset: int = 0) -> dict:
    """Get list of all matches (paginated, 25 per page)."""
    return _api_get("matches", {"offset": offset}, cache_ttl=CACHE_MEDIUM)


def get_match_info(match_id: str) -> dict:
    """Get detailed info for a specific match by ID."""
    return _api_get("match_info", {"id": match_id}, cache_ttl=CACHE_SHORT)


def get_live_scores() -> dict:
    """Get live cricket scores for all running matches."""
    return _api_get("cricScore", cache_ttl=CACHE_SHORT)


def search_series(query: str = "IPL", offset: int = 0) -> dict:
    """Search for cricket series by name (e.g., 'IPL', 'World Cup')."""
    return _api_get("series", {"search": query, "offset": offset}, cache_ttl=CACHE_LONG)


def get_series_info(series_id: str) -> dict:
    """Get detailed series info including all matches."""
    return _api_get("series_info", {"id": series_id}, cache_ttl=CACHE_MEDIUM)


def get_player_info(player_id: str) -> dict:
    """Get detailed player information."""
    return _api_get("players_info", {"id": player_id}, cache_ttl=CACHE_LONG)


def search_players(query: str, offset: int = 0) -> dict:
    """Search for players by name."""
    return _api_get("players", {"search": query, "offset": offset}, cache_ttl=CACHE_LONG)
