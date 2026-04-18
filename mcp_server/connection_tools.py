"""MCP Tools — Fan connection management (match-based friend-making)."""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.firestore import (
    create_connection,
    get_connections,
)


def connect_fans(user_id_1: str, user_id_2: str, match_id: str,
                 reason: str = "") -> dict:
    """Connect two fans who bonded over a match experience.

    Creates a connection record between two fans, anchored to the match
    that brought them together (e.g., both celebrated a last-ball six).

    Args:
        user_id_1: First fan's user ID.
        user_id_2: Second fan's user ID.
        match_id: The match ID that sparked this connection.
        reason: Why these fans connected (e.g., "Both celebrated Dhoni's six").

    Returns:
        dict: The created connection record.
    """
    return create_connection(user_id_1, user_id_2, match_id, reason)


def view_connections(user_id: str) -> dict:
    """View all fan connections for a user — see your cricket friend network.

    Args:
        user_id: The fan's user ID.

    Returns:
        dict: List of connections with match context and connection reasons.
    """
    connections = get_connections(user_id)
    return {
        "user_id": user_id,
        "connections": connections,
        "count": len(connections),
        "message": f"You have {len(connections)} cricket connection(s)!"
    }
