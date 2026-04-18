"""FanZone AI — MCP Server

Aggregates all 16 tools across 4 toolsets:
  - Match Tools (6): live matches, scores, details, recent, IPL, series search
  - Fan Tools (4): register, view profile, find team fans, discover similar fans
  - Discussion Tools (4): start, get, reply, react
  - Connection Tools (2): connect fans, view connections
  + Player tools, team info
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from mcp.server.fastmcp import FastMCP

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

# Initialize MCP server
mcp = FastMCP("fanzone_cricket_server")


# ── Match Tools ───────────────────────────────────────────────

@mcp.tool()
def tool_get_live_matches() -> dict:
    """Get all currently live and recently completed cricket matches with real-time scores."""
    return get_live_matches()

@mcp.tool()
def tool_get_live_scores() -> dict:
    """Get real-time live scores for all running cricket matches worldwide."""
    return get_live_cricket_scores()

@mcp.tool()
def tool_get_match_details(match_id: str) -> dict:
    """Get full detailed info for a specific match by its CricAPI match ID."""
    return get_match_details(match_id)

@mcp.tool()
def tool_get_recent_matches(count: int = 10) -> dict:
    """Get the most recent cricket matches."""
    return get_recent_matches(count)

@mcp.tool()
def tool_get_ipl_matches() -> dict:
    """Get all IPL matches for the current season with real-time scores."""
    return get_ipl_matches()

@mcp.tool()
def tool_search_series(query: str) -> dict:
    """Search for a cricket series/tournament by name (e.g., 'IPL', 'World Cup')."""
    return search_cricket_series(query)

@mcp.tool()
def tool_get_team_info(team_code: str) -> dict:
    """Get IPL team fan info — fan base, rivalries, fun facts, key players."""
    return get_team_info(team_code)

@mcp.tool()
def tool_get_player_details(player_name: str) -> dict:
    """Search for a player and get their profile from CricAPI."""
    return get_player_details(player_name)

@mcp.tool()
def tool_get_matches_for_team(team_name: str) -> dict:
    """Get current/recent matches involving a specific team."""
    return get_matches_for_team(team_name)


# ── Fan Tools ─────────────────────────────────────────────────

@mcp.tool()
def tool_register_fan(user_id: str, display_name: str, favorite_team: str,
                      bio: str = "", location: str = "") -> dict:
    """Register a new fan with their team loyalty."""
    return register_fan(user_id, display_name, favorite_team, bio, location)

@mcp.tool()
def tool_view_fan_profile(user_id: str) -> dict:
    """View a fan's profile."""
    return view_fan_profile(user_id)

@mcp.tool()
def tool_find_team_fans(team_code: str) -> dict:
    """Find all fans supporting a specific team."""
    return find_team_fans(team_code)

@mcp.tool()
def tool_discover_similar_fans(user_id: str) -> dict:
    """Discover fans with similar team loyalties for connection matching."""
    return discover_similar_fans(user_id)


# ── Discussion Tools ──────────────────────────────────────────

@mcp.tool()
def tool_start_discussion(match_id: str, user_id: str, title: str,
                          content: str, tags: str = "") -> dict:
    """Start a new match discussion thread."""
    return start_discussion(match_id, user_id, title, content, tags)

@mcp.tool()
def tool_get_match_discussions(match_id: str) -> dict:
    """Get all fan discussions for a match."""
    return get_match_discussions(match_id)

@mcp.tool()
def tool_reply_to_discussion(discussion_id: str, user_id: str, content: str) -> dict:
    """Reply to a match discussion."""
    return reply_to_discussion(discussion_id, user_id, content)

@mcp.tool()
def tool_react_to_discussion(discussion_id: str, emoji: str) -> dict:
    """React to a discussion (🔥 💯 😢 🎉 👏)."""
    return react_to_discussion(discussion_id, emoji)


# ── Connection Tools ──────────────────────────────────────────

@mcp.tool()
def tool_connect_fans(user_id_1: str, user_id_2: str, match_id: str,
                      reason: str = "") -> dict:
    """Connect two fans who bonded over a match."""
    return connect_fans(user_id_1, user_id_2, match_id, reason)

@mcp.tool()
def tool_view_connections(user_id: str) -> dict:
    """View all cricket connections for a fan."""
    return view_connections(user_id)


if __name__ == "__main__":
    mcp.run(transport="stdio")
