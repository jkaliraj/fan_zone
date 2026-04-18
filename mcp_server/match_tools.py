"""MCP Tools — Real-time cricket match data from CricAPI (CricketData.org).

Uses live API endpoints for current matches, scores, match details, and series info.
Env: CRICKET_API_KEY must be set (free key from https://cricketdata.org/signup.aspx).
"""

import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from cricket_api.client import (
    get_current_matches,
    get_match_info,
    get_live_scores,
    search_series,
    get_series_info,
    search_players,
    get_player_info,
    get_all_matches,
    is_india_match,
)

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")


def _load_teams() -> dict:
    with open(os.path.join(DATA_DIR, "teams.json"), "r", encoding="utf-8") as f:
        return json.load(f)


def get_live_matches() -> dict:
    """Get currently live and recently completed Indian cricket matches with real-time scores."""
    result = get_current_matches()
    if result.get("status") != "success":
        return {"error": "Failed to fetch live matches", "detail": result.get("error", "")}
    matches = [m for m in result.get("data", []) if is_india_match(m)]
    live = [m for m in matches if m.get("matchStarted", False) and not m.get("matchEnded", False)]
    recent = [m for m in matches if m.get("matchEnded", False)]
    return {
        "live_matches": live,
        "live_count": len(live),
        "recent_completed": recent[:10],
        "recent_count": len(recent[:10]),
        "total_current": len(matches),
    }


def get_live_cricket_scores() -> dict:
    """Get real-time live scores for Indian cricket matches."""
    result = get_live_scores()
    if result.get("status") != "success":
        return {"error": "Failed to fetch live scores", "detail": result.get("error", "")}
    scores = [s for s in result.get("data", []) if is_india_match(s)]
    return {"scores": scores, "count": len(scores)}


def get_match_details(match_id: str) -> dict:
    """Get full detailed information for a specific cricket match by its CricAPI match ID.

    Args:
        match_id: The CricAPI match UUID.

    Returns:
        dict: Complete match details including scores, teams, venue, result, scorecard.
    """
    result = get_match_info(match_id)
    if result.get("status") != "success":
        return {"error": f"Failed to fetch match '{match_id}'", "detail": result.get("error", "")}
    return result.get("data", {})


def get_recent_matches(count: int = 10) -> dict:
    """Get the most recent Indian cricket matches.

    Args:
        count: Number of recent matches to return (default 10, max 25 per page).

    Returns:
        dict: List of recent Indian matches with results, dates, venues.
    """
    result = get_all_matches(offset=0)
    if result.get("status") != "success":
        return {"error": "Failed to fetch matches", "detail": result.get("error", "")}
    matches = [m for m in result.get("data", []) if is_india_match(m)]
    matches.sort(key=lambda x: x.get("dateTimeGMT", ""), reverse=True)
    return {"recent_matches": matches[:count], "count": min(count, len(matches))}


def get_ipl_matches() -> dict:
    """Get all IPL (Indian Premier League) matches for the current season."""
    series_result = search_series("Indian Premier League")
    if series_result.get("status") != "success":
        return {"error": "Failed to search for IPL series", "detail": series_result.get("error", "")}
    series_list = series_result.get("data", [])
    if not series_list:
        return {"error": "No IPL series found in the database"}
    latest_ipl = series_list[0]
    series_id = latest_ipl.get("id", "")
    info_result = get_series_info(series_id)
    if info_result.get("status") != "success":
        return {"error": "Failed to fetch IPL series details", "detail": info_result.get("error", "")}
    data = info_result.get("data", {})
    return {
        "series": data.get("info", {}),
        "matches": data.get("matchList", []),
        "match_count": len(data.get("matchList", [])),
    }


def search_cricket_series(query: str) -> dict:
    """Search for any cricket series/tournament by name (e.g., 'IPL', 'World Cup', 'Ashes').

    Args:
        query: Search term for the series name.

    Returns:
        dict: List of matching series with IDs, names, dates.
    """
    result = search_series(query)
    if result.get("status") != "success":
        return {"error": f"Series search failed for '{query}'", "detail": result.get("error", "")}
    return {"series": result.get("data", []), "count": len(result.get("data", []))}


def get_team_info(team_code: str) -> dict:
    """Get detailed fan information about an IPL team — fan base, rivalries, fun facts, key players.

    Args:
        team_code: Team code (e.g., 'CSK', 'MI', 'RCB') or full team name.

    Returns:
        dict: Team info including players, fan base description, rivalries, fun facts.
    """
    teams = _load_teams()
    code = team_code.strip().upper()
    if code in teams:
        return teams[code]
    name_lower = team_code.strip().lower()
    for k, v in teams.items():
        if name_lower in v.get("name", "").lower() or name_lower in k.lower():
            return v
    return {
        "error": f"Team '{team_code}' not found.",
        "available_teams": [f"{k} — {v['name']}" for k, v in teams.items()],
    }


def get_player_details(player_name: str) -> dict:
    """Search for a cricket player by name and get their detailed profile.

    Args:
        player_name: Player name to search for (e.g., 'Virat Kohli', 'Bumrah').

    Returns:
        dict: Player details including name, country, role, batting/bowling style.
    """
    search_result = search_players(player_name)
    if search_result.get("status") != "success":
        return {"error": f"Player search failed for '{player_name}'", "detail": search_result.get("error", "")}
    players = search_result.get("data", [])
    if not players:
        return {"error": f"No player found matching '{player_name}'"}
    player_id = players[0].get("id", "")
    detail_result = get_player_info(player_id)
    if detail_result.get("status") != "success":
        return {"error": f"Failed to fetch details for player '{player_name}'",
                "basic_info": players[0]}
    return detail_result.get("data", {})


def get_matches_for_team(team_name: str) -> dict:
    """Get current/recent matches involving a specific team from live data.

    Args:
        team_name: Team name or partial name (e.g., 'Chennai', 'Mumbai Indians', 'CSK').

    Returns:
        dict: Matches involving the specified team with real-time data.
    """
    team_info = get_team_info(team_name)
    full_name = team_info.get("name", team_name) if "error" not in team_info else team_name
    search_term = full_name.lower()
    result = get_current_matches()
    if result.get("status") != "success":
        return {"error": "Failed to fetch current matches", "detail": result.get("error", "")}
    matches = result.get("data", [])
    team_matches = []
    for m in matches:
        match_name = m.get("name", "").lower()
        teams_in_match = [t.lower() for t in m.get("teams", [])]
        if search_term in match_name or any(search_term in t for t in teams_in_match):
            team_matches.append(m)
    if not team_matches:
        short_name = search_term.split()[-1] if search_term else team_name
        for m in matches:
            if short_name in m.get("name", "").lower():
                team_matches.append(m)
    return {"team": full_name, "matches": team_matches, "count": len(team_matches)}
