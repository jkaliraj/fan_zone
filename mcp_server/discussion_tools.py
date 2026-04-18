"""MCP Tools — Match discussion threads, reactions, and replies."""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.firestore import (
    create_discussion,
    get_discussions_for_match,
    add_reply,
    add_reaction,
)


def start_discussion(match_id: str, user_id: str, title: str,
                     content: str, tags: str = "") -> dict:
    """Start a new discussion thread about a match — share your thoughts and reactions.

    Creates a discussion that other fans can reply to and react on,
    centered around a specific live or recent match.

    Args:
        match_id: The match ID this discussion is about.
        user_id: The fan starting the discussion.
        title: Discussion title (e.g., "That last over was insane!").
        content: The discussion body text.
        tags: Comma-separated tags (e.g., "thriller,last-over,dhoni").

    Returns:
        dict: The created discussion thread with ID.
    """
    tag_list = [t.strip() for t in tags.split(",") if t.strip()] if tags else []
    return create_discussion(match_id, user_id, title, content, tag_list)


def get_match_discussions(match_id: str) -> dict:
    """Get all fan discussions for a specific match — see what the community is saying.

    Args:
        match_id: The match ID to get discussions for.

    Returns:
        dict: List of discussion threads with replies and reactions.
    """
    discussions = get_discussions_for_match(match_id)
    return {
        "match_id": match_id,
        "discussions": discussions,
        "count": len(discussions),
    }


def reply_to_discussion(discussion_id: str, user_id: str, content: str) -> dict:
    """Reply to an existing match discussion thread.

    Args:
        discussion_id: The discussion thread ID to reply to.
        user_id: The fan posting the reply.
        content: The reply text.

    Returns:
        dict: The created reply.
    """
    return add_reply(discussion_id, user_id, content)


def react_to_discussion(discussion_id: str, emoji: str) -> dict:
    """React to a discussion with an emoji (🔥 💯 😢 🎉 👏).

    Args:
        discussion_id: The discussion to react to.
        emoji: One of: 🔥 (fire), 💯 (hundred), 😢 (sad), 🎉 (celebrate), 👏 (clap).

    Returns:
        dict: Confirmation of the reaction.
    """
    return add_reaction(discussion_id, emoji)
