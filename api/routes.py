"""FanZone AI — REST API Routes

Real-time cricket data (CricAPI) + Gemini AI + Firestore fan data.
"""

import json
from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import Optional

from cricket_api.client import (
    get_current_matches,
    get_match_info,
    get_live_scores,
    search_series,
    get_series_info,
    get_all_matches,
    search_players,
    get_player_info,
    is_india_match,
)
from db.firestore import (
    create_fan_profile,
    get_fan_profile,
    find_fans_by_team,
    find_similar_fans,
    create_discussion,
    get_discussions_for_match,
    add_reply,
    add_reaction,
    create_connection,
    get_connections,
)
from gemini_ai import ai_chat, ai_match_analysis, ai_fan_matchmaker, ai_discussion_starter
from agent_runner import run_agent_chat

router = APIRouter()


# ── Request Models ────────────────────────────────────────────

class FanRegisterRequest(BaseModel):
    user_id: str
    display_name: str
    favorite_team: str
    bio: Optional[str] = ""
    location: Optional[str] = ""


class DiscussionCreateRequest(BaseModel):
    match_id: str
    user_id: str
    title: str
    content: str
    tags: Optional[str] = ""


class ReplyRequest(BaseModel):
    user_id: str
    content: str


class ReactionRequest(BaseModel):
    emoji: str


class ConnectionRequest(BaseModel):
    user_id_1: str
    user_id_2: str
    match_id: str
    reason: Optional[str] = ""


class ChatRequest(BaseModel):
    message: str
    user_id: Optional[str] = "anonymous"


# ── Cricket Data (Real-time CricAPI) ─────────────────────────

@router.get("/live-scores")
async def api_live_scores():
    """Real-time live scores — Indian cricket only.
    Uses currentMatches (has live/recent IPL data) + cricScore as supplement."""
    matches = []
    # Primary: currentMatches has actual live IPL matches
    cm = get_current_matches()
    if cm.get("status") == "success":
        for m in cm.get("data", []):
            if is_india_match(m):
                # Normalize fields for frontend compatibility
                teams = m.get("teams", [])
                m.setdefault("t1", teams[0] if teams else "")
                m.setdefault("t2", teams[1] if len(teams) > 1 else "")
                m.setdefault("ms", "live" if (m.get("matchStarted") and not m.get("matchEnded")) else "result")
                # Build t1s/t2s from score array (deduplicated)
                seen_innings = set()
                t1_scores = []
                t2_scores = []
                for sc in m.get("score", []):
                    inning = sc.get("inning", "")
                    if inning in seen_innings:
                        continue
                    seen_innings.add(inning)
                    score_str = f"{sc.get('r', 0)}/{sc.get('w', 0)} ({sc.get('o', 0)})"
                    if teams and teams[0].lower().split()[0] in inning.lower():
                        t1_scores.append(score_str)
                    elif len(teams) > 1 and teams[1].lower().split()[0] in inning.lower():
                        t2_scores.append(score_str)
                if t1_scores:
                    m["t1s"] = " & ".join(t1_scores)
                if t2_scores:
                    m["t2s"] = " & ".join(t2_scores)
                # Also extract team images
                for ti in m.get("teamInfo", []):
                    if teams and ti.get("name") == teams[0]:
                        m["t1img"] = ti.get("img", "")
                    elif len(teams) > 1 and ti.get("name") == teams[1]:
                        m["t2img"] = ti.get("img", "")
                matches.append(m)
    # Supplement with cricScore for upcoming fixtures
    cs = get_live_scores()
    if cs.get("status") == "success":
        seen_ids = {m.get("id") for m in matches}
        for s in cs.get("data", []):
            if is_india_match(s) and s.get("id") not in seen_ids:
                matches.append(s)
    return {"scores": matches, "count": len(matches)}


@router.get("/current-matches")
async def api_current_matches():
    """Currently running and recently completed Indian cricket matches."""
    result = get_current_matches()
    if result.get("status") == "success":
        matches = [m for m in result.get("data", []) if is_india_match(m)]
        # Normalize score data for frontend
        for m in matches:
            teams = m.get("teams", [])
            m.setdefault("t1", teams[0] if teams else "")
            m.setdefault("t2", teams[1] if len(teams) > 1 else "")
            seen_innings = set()
            t1_scores = []
            t2_scores = []
            for sc in m.get("score", []):
                inning = sc.get("inning", "")
                if inning in seen_innings:
                    continue
                seen_innings.add(inning)
                score_str = f"{sc.get('r', 0)}/{sc.get('w', 0)} ({sc.get('o', 0)})"
                if teams and teams[0].lower().split()[0] in inning.lower():
                    t1_scores.append(score_str)
                elif len(teams) > 1 and teams[1].lower().split()[0] in inning.lower():
                    t2_scores.append(score_str)
            if t1_scores:
                m["t1s"] = " & ".join(t1_scores)
            if t2_scores:
                m["t2s"] = " & ".join(t2_scores)
        return {"matches": matches, "count": len(matches)}
    return {"matches": [], "count": 0, "error": result.get("error", "API unavailable")}


@router.get("/match/{match_id}")
async def api_match_detail(match_id: str):
    """Detailed info for a specific match."""
    result = get_match_info(match_id)
    if result.get("status") == "success":
        return result.get("data", {})
    return {"error": result.get("error", "Match not found")}


@router.get("/recent-matches")
async def api_recent_matches(count: int = Query(default=10, ge=1, le=25)):
    """Recent Indian cricket matches — uses currentMatches which has live/recent IPL data."""
    result = get_current_matches()
    if result.get("status") == "success":
        matches = [m for m in result.get("data", []) if is_india_match(m)]
        matches.sort(key=lambda x: x.get("dateTimeGMT", ""), reverse=True)
        return {"matches": matches[:count], "count": min(count, len(matches))}
    return {"matches": [], "count": 0}


@router.get("/ipl")
async def api_ipl():
    """Current IPL season matches."""
    sr = search_series("Indian Premier League")
    if sr.get("status") != "success" or not sr.get("data"):
        return {"error": "IPL series not found", "series": None, "matches": []}
    latest = sr["data"][0]
    info = get_series_info(latest["id"])
    if info.get("status") == "success":
        d = info.get("data", {})
        return {"series": d.get("info", {}), "matches": d.get("matchList", [])}
    return {"series": latest, "matches": []}


@router.get("/series/search")
async def api_search_series(q: str = Query(..., min_length=1)):
    """Search for a cricket series."""
    result = search_series(q)
    if result.get("status") == "success":
        return {"series": result.get("data", [])}
    return {"series": []}


@router.get("/team/{team_code}")
async def api_team_info(team_code: str):
    """IPL team fan data (curated)."""
    import json, os
    data_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "teams.json")
    with open(data_path, "r") as f:
        teams = json.load(f)
    code = team_code.strip().upper()
    if code in teams:
        return teams[code]
    for k, v in teams.items():
        if team_code.lower() in v.get("name", "").lower():
            return v
    return {"error": f"Team '{team_code}' not found"}


@router.get("/player/search")
async def api_player_search(q: str = Query(..., min_length=1)):
    """Search for a player."""
    result = search_players(q)
    if result.get("status") == "success" and result.get("data"):
        player = result["data"][0]
        detail = get_player_info(player["id"])
        if detail.get("status") == "success":
            return detail.get("data", player)
        return player
    return {"error": f"Player '{q}' not found"}


# ── Fan Profiles ──────────────────────────────────────────────

@router.post("/fan/register")
async def api_register_fan(req: FanRegisterRequest):
    return create_fan_profile(req.user_id, req.display_name, req.favorite_team,
                              req.bio, req.location)


@router.get("/fan/{user_id}")
async def api_fan_profile(user_id: str):
    return get_fan_profile(user_id)


@router.get("/fans/team/{team_code}")
async def api_team_fans(team_code: str):
    fans = find_fans_by_team(team_code.upper())
    return {"team": team_code.upper(), "fans": fans, "count": len(fans)}


@router.get("/fan/{user_id}/similar")
async def api_similar_fans(user_id: str):
    profile = get_fan_profile(user_id)
    if "error" in profile:
        return profile
    similar = find_similar_fans(user_id)
    # Use Gemini for smart matching suggestions
    try:
        ai_suggestions = await ai_fan_matchmaker(profile, similar[:5])
    except Exception:
        ai_suggestions = ""
    return {"similar_fans": similar, "ai_suggestion": ai_suggestions}


# ── Discussions ───────────────────────────────────────────────

@router.post("/discussion/create")
async def api_create_discussion(req: DiscussionCreateRequest):
    tags = [t.strip() for t in req.tags.split(",") if t.strip()] if req.tags else []
    return create_discussion(req.match_id, req.user_id, req.title, req.content, tags)


@router.get("/discussion/match/{match_id}")
async def api_match_discussions(match_id: str):
    discs = get_discussions_for_match(match_id)
    return {"match_id": match_id, "discussions": discs, "count": len(discs)}


@router.post("/discussion/{disc_id}/reply")
async def api_reply(disc_id: str, req: ReplyRequest):
    return add_reply(disc_id, req.user_id, req.content)


@router.post("/discussion/{disc_id}/react")
async def api_react(disc_id: str, req: ReactionRequest):
    return add_reaction(disc_id, req.emoji)


@router.get("/discussion/suggest/{match_id}")
async def api_suggest_discussions(match_id: str):
    """AI-generated discussion topic suggestions for a match."""
    match_result = get_match_info(match_id)
    match_data = match_result.get("data", {}) if match_result.get("status") == "success" else {}
    try:
        suggestions = await ai_discussion_starter(match_data)
        return {"suggestions": suggestions}
    except Exception as e:
        return {"suggestions": "", "error": str(e)}


# ── Connections ───────────────────────────────────────────────

@router.post("/connection/create")
async def api_create_connection(req: ConnectionRequest):
    return create_connection(req.user_id_1, req.user_id_2, req.match_id, req.reason)


@router.get("/connection/{user_id}")
async def api_connections(user_id: str):
    conns = get_connections(user_id)
    return {"user_id": user_id, "connections": conns, "count": len(conns)}


# ── AI Chat (Gemini 2.5 Flash) ───────────────────────────────

@router.post("/chat")
async def api_chat(req: ChatRequest):
    """Chat with FanZone AI powered by Gemini 2.5 Flash."""
    try:
        response = await ai_chat(req.message)
        return {"response": response, "user_id": req.user_id}
    except Exception as e:
        return {"response": f"Sorry, AI is temporarily unavailable: {str(e)}", "user_id": req.user_id}


@router.get("/match/{match_id}/analysis")
async def api_match_analysis(match_id: str):
    """AI-powered match analysis."""
    match_result = get_match_info(match_id)
    if match_result.get("status") != "success":
        return {"error": "Match not found"}
    try:
        analysis = await ai_match_analysis(match_result.get("data", {}))
        return {"match_id": match_id, "analysis": analysis}
    except Exception as e:
        return {"error": str(e)}


# ── ADK Multi-Agent Chat ─────────────────────────────────────

@router.post("/agent-chat")
async def api_agent_chat(req: ChatRequest):
    """Chat with the ADK multi-agent system (Commander → Match/Fan/Discussion/Connection).

    This routes through the full ADK agent pipeline with FunctionTools that access
    real CricAPI data, Firestore fan profiles, discussions, and connections.
    """
    try:
        response = await run_agent_chat(req.user_id, req.message)
        return {"response": response, "user_id": req.user_id, "engine": "adk-agents"}
    except Exception as e:
        return {"response": f"Agent system error: {str(e)}", "user_id": req.user_id, "engine": "adk-agents"}
