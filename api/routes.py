"""FanZone AI — REST API Routes

All programmatic endpoints for the fan connection platform.
Uses real-time CricAPI data for match information.
"""

from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import Optional

from mcp_server.match_tools import (
    get_live_matches,
    get_live_cricket_scores,
    get_match_details,
    get_recent_matches,
    get_ipl_matches,
    search_cricket_series,
    get_team_info,
    get_player_details,
    get_matches_for_team,
)
from mcp_server.fan_tools import (
    register_fan,
    view_fan_profile,
    find_team_fans,
    discover_similar_fans,
)
from mcp_server.discussion_tools import (
    start_discussion,
    get_match_discussions,
    reply_to_discussion,
    react_to_discussion,
)
from mcp_server.connection_tools import (
    connect_fans,
    view_connections,
)

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


# ── Match Endpoints (Real-time CricAPI) ──────────────────────

@router.get("/live-matches")
async def api_live_matches():
    """Get all currently live and recently completed matches."""
    return get_live_matches()


@router.get("/live-scores")
async def api_live_scores():
    """Get real-time live scores for all running matches."""
    return get_live_cricket_scores()


@router.get("/match/{match_id}")
async def api_match_details(match_id: str):
    """Get detailed info for a specific match."""
    return get_match_details(match_id)


@router.get("/recent-matches")
async def api_recent_matches(count: int = Query(default=10, ge=1, le=25)):
    """Get recent matches."""
    return get_recent_matches(count)


@router.get("/ipl-matches")
async def api_ipl_matches():
    """Get all IPL matches for the current season."""
    return get_ipl_matches()


@router.get("/series/search")
async def api_search_series(q: str = Query(..., min_length=1)):
    """Search for a cricket series by name."""
    return search_cricket_series(q)


@router.get("/team/{team_code}")
async def api_team_info(team_code: str):
    """Get IPL team fan info."""
    return get_team_info(team_code)


@router.get("/player/search")
async def api_player_search(q: str = Query(..., min_length=1)):
    """Search for a player by name."""
    return get_player_details(q)


@router.get("/team/{team_code}/matches")
async def api_team_matches(team_code: str):
    """Get matches for a specific team."""
    return get_matches_for_team(team_code)


# ── Fan Endpoints ─────────────────────────────────────────────

@router.post("/fan/register")
async def api_register_fan(req: FanRegisterRequest):
    """Register a new fan."""
    return register_fan(req.user_id, req.display_name, req.favorite_team,
                        req.bio, req.location)


@router.get("/fan/{user_id}")
async def api_fan_profile(user_id: str):
    """View a fan's profile."""
    return view_fan_profile(user_id)


@router.get("/fan/team/{team_code}")
async def api_team_fans(team_code: str):
    """Find fans supporting a specific team."""
    return find_team_fans(team_code)


@router.get("/fan/{user_id}/similar")
async def api_similar_fans(user_id: str):
    """Discover fans with similar team loyalties."""
    return discover_similar_fans(user_id)


# ── Discussion Endpoints ──────────────────────────────────────

@router.post("/discussion/create")
async def api_create_discussion(req: DiscussionCreateRequest):
    """Start a new match discussion."""
    return start_discussion(req.match_id, req.user_id, req.title,
                           req.content, req.tags)


@router.get("/discussion/match/{match_id}")
async def api_match_discussions(match_id: str):
    """Get all discussions for a match."""
    return get_match_discussions(match_id)


@router.post("/discussion/{disc_id}/reply")
async def api_reply_discussion(disc_id: str, req: ReplyRequest):
    """Reply to a discussion."""
    return reply_to_discussion(disc_id, req.user_id, req.content)


@router.post("/discussion/{disc_id}/react")
async def api_react_discussion(disc_id: str, req: ReactionRequest):
    """React to a discussion."""
    return react_to_discussion(disc_id, req.emoji)


# ── Connection Endpoints ──────────────────────────────────────

@router.post("/connection/create")
async def api_create_connection(req: ConnectionRequest):
    """Connect two fans over a match experience."""
    return connect_fans(req.user_id_1, req.user_id_2, req.match_id, req.reason)


@router.get("/connection/{user_id}")
async def api_view_connections(user_id: str):
    """View a fan's connection network."""
    return view_connections(user_id)


# ── Chat Endpoint (Agent) ────────────────────────────────────

@router.post("/chat")
async def api_chat(req: ChatRequest):
    """Chat with the FanZone AI agent."""
    from google.adk.runners import Runner
    from google.adk.sessions import InMemorySessionService
    from google.genai import types
    from agents.commander import commander_agent

    session_service = InMemorySessionService()
    runner = Runner(
        agent=commander_agent,
        app_name="fanzone_ai",
        session_service=session_service,
    )

    session = session_service.create_session(
        app_name="fanzone_ai",
        user_id=req.user_id,
    )

    user_message = types.Content(
        role="user",
        parts=[types.Part.from_text(req.message)],
    )

    response_text = ""
    async for event in runner.run_async(
        user_id=req.user_id,
        session_id=session.id,
        new_message=user_message,
    ):
        if event.is_final_response():
            for part in event.content.parts:
                if part.text:
                    response_text += part.text

    return {
        "user_id": req.user_id,
        "message": req.message,
        "response": response_text,
    }
