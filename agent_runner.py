"""FanZone AI — ADK Agent Runner

Runs the ADK multi-agent system (Commander → Match/Fan/Discussion/Connection agents)
as an API endpoint so end users can chat with the agents through the web UI.
"""

import asyncio
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

from agents.commander import commander_agent

# Shared session service (in-memory, reset on restart)
_session_service = InMemorySessionService()

APP_NAME = "fanzone_ai"


async def run_agent_chat(user_id: str, message: str) -> str:
    """Send a message to the ADK multi-agent system and return the final text response.

    The Commander agent routes to the appropriate sub-agent (match, fan, discussion,
    connection) based on intent. Each sub-agent has FunctionTools that call real
    CricAPI data, Firestore, etc.

    Args:
        user_id: Unique user/session identifier.
        message: The user's chat message.

    Returns:
        str: The agent's text response.
    """
    # Get or create session for this user
    session = await _session_service.get_session(
        app_name=APP_NAME,
        user_id=user_id,
    )
    if session is None:
        session = await _session_service.create_session(
            app_name=APP_NAME,
            user_id=user_id,
        )

    runner = Runner(
        agent=commander_agent,
        app_name=APP_NAME,
        session_service=_session_service,
    )

    content = types.Content(
        role="user",
        parts=[types.Part(text=message)],
    )

    final_response = ""
    async for event in runner.run_async(
        user_id=user_id,
        session_id=session.id,
        new_message=content,
    ):
        if event.is_final_response():
            for part in event.content.parts:
                if part.text:
                    final_response += part.text

    return final_response or "I couldn't process that request. Try asking about live scores, teams, or fan connections!"
