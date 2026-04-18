"""FanZone AI — Firestore CRUD operations for fan profiles, discussions, and connections."""

import os
import uuid
from datetime import datetime, timezone

# In-memory fallback when Firestore is unavailable (local dev)
_in_memory_store = {
    "fan_profiles": {},
    "discussions": {},
    "connections": {},
    "reactions": {},
}

_firestore_client = None


def _get_db():
    """Get Firestore client, or None if unavailable."""
    global _firestore_client
    if _firestore_client is not None:
        return _firestore_client
    try:
        from google.cloud import firestore
        _firestore_client = firestore.Client(
            project=os.environ.get("GOOGLE_CLOUD_PROJECT", "fanzone-ai")
        )
        return _firestore_client
    except Exception:
        return None


def _now_iso():
    return datetime.now(timezone.utc).isoformat()


# ── Fan Profiles ──────────────────────────────────────────────

def create_fan_profile(user_id: str, display_name: str, favorite_team: str,
                       bio: str = "", location: str = "") -> dict:
    """Create or update a fan profile."""
    profile = {
        "user_id": user_id,
        "display_name": display_name,
        "favorite_team": favorite_team,
        "bio": bio,
        "location": location,
        "teams_following": [favorite_team],
        "matches_attended": [],
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
    }
    db = _get_db()
    if db:
        db.collection("fan_profiles").document(user_id).set(profile)
    else:
        _in_memory_store["fan_profiles"][user_id] = profile
    return profile


def get_fan_profile(user_id: str) -> dict:
    """Retrieve a fan profile."""
    db = _get_db()
    if db:
        doc = db.collection("fan_profiles").document(user_id).get()
        if doc.exists:
            return doc.to_dict()
    else:
        if user_id in _in_memory_store["fan_profiles"]:
            return _in_memory_store["fan_profiles"][user_id]
    return {"error": f"Fan profile '{user_id}' not found."}


def find_fans_by_team(team_code: str) -> list:
    """Find all fans following a specific team."""
    db = _get_db()
    fans = []
    if db:
        docs = db.collection("fan_profiles").where(
            "teams_following", "array_contains", team_code
        ).stream()
        for doc in docs:
            fans.append(doc.to_dict())
    else:
        for profile in _in_memory_store["fan_profiles"].values():
            if team_code in profile.get("teams_following", []):
                fans.append(profile)
    return fans


def find_similar_fans(user_id: str) -> list:
    """Find fans with similar team loyalties."""
    profile = get_fan_profile(user_id)
    if "error" in profile:
        return [profile]
    team = profile.get("favorite_team", "")
    team_fans = find_fans_by_team(team)
    return [f for f in team_fans if f.get("user_id") != user_id]


# ── Discussions ───────────────────────────────────────────────

def create_discussion(match_id: str, user_id: str, title: str,
                      content: str, tags: list = None) -> dict:
    """Create a new discussion thread for a match."""
    disc_id = f"disc_{uuid.uuid4().hex[:8]}"
    discussion = {
        "discussion_id": disc_id,
        "match_id": match_id,
        "user_id": user_id,
        "title": title,
        "content": content,
        "tags": tags or [],
        "replies": [],
        "reactions": {"🔥": 0, "💯": 0, "😢": 0, "🎉": 0, "👏": 0},
        "created_at": _now_iso(),
    }
    db = _get_db()
    if db:
        db.collection("discussions").document(disc_id).set(discussion)
    else:
        _in_memory_store["discussions"][disc_id] = discussion
    return discussion


def get_discussions_for_match(match_id: str) -> list:
    """Get all discussions for a specific match."""
    db = _get_db()
    discussions = []
    if db:
        docs = db.collection("discussions").where(
            "match_id", "==", match_id
        ).stream()
        for doc in docs:
            discussions.append(doc.to_dict())
    else:
        for disc in _in_memory_store["discussions"].values():
            if disc.get("match_id") == match_id:
                discussions.append(disc)
    return discussions


def add_reply(discussion_id: str, user_id: str, content: str) -> dict:
    """Add a reply to a discussion."""
    reply = {
        "reply_id": f"reply_{uuid.uuid4().hex[:8]}",
        "user_id": user_id,
        "content": content,
        "timestamp": _now_iso(),
    }
    db = _get_db()
    if db:
        from google.cloud.firestore_v1 import ArrayUnion
        db.collection("discussions").document(discussion_id).update({
            "replies": ArrayUnion([reply])
        })
    else:
        disc = _in_memory_store["discussions"].get(discussion_id)
        if disc:
            disc["replies"].append(reply)
    return reply


def add_reaction(discussion_id: str, emoji: str) -> dict:
    """Add a reaction to a discussion."""
    valid_emojis = ["🔥", "💯", "😢", "🎉", "👏"]
    if emoji not in valid_emojis:
        return {"error": f"Invalid reaction. Use one of: {valid_emojis}"}
    db = _get_db()
    if db:
        from google.cloud.firestore_v1 import Increment
        db.collection("discussions").document(discussion_id).update({
            f"reactions.{emoji}": Increment(1)
        })
    else:
        disc = _in_memory_store["discussions"].get(discussion_id)
        if disc:
            disc["reactions"][emoji] = disc["reactions"].get(emoji, 0) + 1
    return {"discussion_id": discussion_id, "reaction": emoji, "status": "added"}


# ── Connections ───────────────────────────────────────────────

def create_connection(user_id_1: str, user_id_2: str, match_id: str,
                      reason: str = "") -> dict:
    """Create a fan connection."""
    conn_id = f"conn_{uuid.uuid4().hex[:8]}"
    connection = {
        "connection_id": conn_id,
        "user_id_1": user_id_1,
        "user_id_2": user_id_2,
        "match_id": match_id,
        "reason": reason,
        "status": "active",
        "created_at": _now_iso(),
    }
    db = _get_db()
    if db:
        db.collection("connections").document(conn_id).set(connection)
    else:
        _in_memory_store["connections"][conn_id] = connection
    return connection


def get_connections(user_id: str) -> list:
    """Get all connections for a user."""
    db = _get_db()
    connections = []
    if db:
        docs1 = db.collection("connections").where("user_id_1", "==", user_id).stream()
        docs2 = db.collection("connections").where("user_id_2", "==", user_id).stream()
        for doc in docs1:
            connections.append(doc.to_dict())
        for doc in docs2:
            connections.append(doc.to_dict())
    else:
        for conn in _in_memory_store["connections"].values():
            if conn.get("user_id_1") == user_id or conn.get("user_id_2") == user_id:
                connections.append(conn)
    return connections
