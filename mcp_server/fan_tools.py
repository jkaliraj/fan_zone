"""MCP Tools — Fan profile management and community features."""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.firestore import (
    create_fan_profile,
    get_fan_profile,
    find_fans_by_team,
    find_similar_fans,
)


def register_fan(user_id: str, display_name: str, favorite_team: str,
                 bio: str = "", location: str = "") -> dict:
    """Register a new fan profile with team loyalty and bio.

    Args:
        user_id: Unique identifier for the fan.
        display_name: Fan's display name.
        favorite_team: Primary team code (e.g., 'CSK', 'MI', 'RCB').
        bio: Short bio about the fan (optional).
        location: Fan's city/location (optional).

    Returns:
        dict: The created fan profile.
    """
    return create_fan_profile(user_id, display_name, favorite_team, bio, location)


def view_fan_profile(user_id: str) -> dict:
    """View a fan's profile including their team loyalties and activity.

    Args:
        user_id: The fan's unique identifier.

    Returns:
        dict: Fan profile with team, bio, location, and activity history.
    """
    return get_fan_profile(user_id)


def find_team_fans(team_code: str) -> dict:
    """Find all fans who follow a specific team — great for building connections.

    Args:
        team_code: Team code (e.g., 'CSK', 'MI', 'RCB').

    Returns:
        dict: List of fans following the specified team.
    """
    fans = find_fans_by_team(team_code)
    return {
        "team": team_code,
        "fans": fans,
        "count": len(fans),
        "message": f"Found {len(fans)} fan(s) supporting {team_code}!"
    }


def discover_similar_fans(user_id: str) -> dict:
    """Discover fans with similar team loyalties — AI-powered fan matching.

    Args:
        user_id: The fan's unique identifier.

    Returns:
        dict: List of similar fans with shared team loyalty.
    """
    similar = find_similar_fans(user_id)
    if similar and "error" in similar[0]:
        return similar[0]
    return {
        "user_id": user_id,
        "similar_fans": similar,
        "count": len(similar),
        "message": f"Found {len(similar)} fan(s) with similar team loyalty!"
    }
